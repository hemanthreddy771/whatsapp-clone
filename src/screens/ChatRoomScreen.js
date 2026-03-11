import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MessageBubble from '../components/MessageBubble';
import { nativeDb as db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification } from '../utils/notifications';
import firestore from '@react-native-firebase/firestore';

import Colors from '../constants/Colors';

const ChatRoomScreen = ({ route }) => {
  const { chatId, chatName } = route.params || { chatId: 'general_room', chatName: 'Chat' };
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { user, userData } = useAuth();

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!chatId || !user?.uid) return;

    // Use ONLY Native SDK methods
    const unsubscribe = db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot((snapshot) => {
        if (snapshot) {
          const fetchedMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(fetchedMessages);
        }
      }, (err) => console.log("Message fetch error:", err));

    // Listen for other user's typing status safely using Native SDK
    const unsubscribeTyping = db.collection('chats').doc(chatId).onSnapshot((docSnap) => {
      if (docSnap && docSnap.exists && user?.uid) {
        const data = docSnap.data();
        if (data) {
          const receiverId = chatId.replace(user.uid, '').replace('_', '');
          if (receiverId) {
            setIsOtherTyping(data[`typing_${receiverId}`] || false);
          }
        }
      }
    }, (err) => console.log("Typing fetch error:", err));

    // Clear unread count for current user when visiting
    if (user?.uid && chatId) {
      db.collection('chats').doc(chatId).set({
        [`unreadCount_${user.uid}`]: 0
      }, { merge: true }).catch(err => console.log("Clear unread error:", err));
    }

    return () => {
      unsubscribe();
      unsubscribeTyping();
    };
  }, [chatId, user?.uid]);

  const handleTextChange = (text) => {
    setInputText(text);

    if (!user?.uid || !chatId) return;

    // Update typing status in Firestore using Native SDK
    db.collection('chats').doc(chatId).set({
      [`typing_${user.uid}`]: true
    }, { merge: true }).catch(e => console.log("Typing update error:", e));

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (user?.uid && chatId) {
        db.collection('chats').doc(chatId).set({
          [`typing_${user.uid}`]: false
        }, { merge: true }).catch(e => console.log("Typing stop error:", e));
      }
    }, 2000);
  };

  const handleLongPressMessage = (message) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            db.collection('chats')
              .doc(chatId)
              .collection('messages')
              .doc(message.id)
              .delete()
              .catch(err => Alert.alert('Error', 'Failed to delete message'));
          }
        }
      ]
    );
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your gallery to send photos/videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadMedia(result.assets[0].uri, result.assets[0].type);
    }
  };

  const uploadMedia = async (uri, type) => {
    setIsUploading(true);
    try {
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const reference = storage.ref(`chats/${chatId}/${filename}`);

      // Use putFile for native reliability
      await reference.putFile(uri);
      const downloadURL = await reference.getDownloadURL();

      sendMessage(null, downloadURL, type);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert('Upload Error', 'Failed to send media.');
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async (customText = null, mediaUrl = null, mediaType = null) => {
    const textToSend = customText !== null ? customText : inputText;
    if ((!textToSend || textToSend.trim() === '') && !mediaUrl) return;

    if (customText === null) setInputText('');

    try {
      const messageData = {
        text: textToSend,
        createdAt: firestore.FieldValue.serverTimestamp(),
        senderId: user.uid,
        senderName: userData?.displayName || 'Unknown',
        mediaUrl: mediaUrl,
        mediaType: mediaType,
      };

      // Add message via Native SDK
      await db.collection('chats').doc(chatId).collection('messages').add(messageData);

      // Update chat metadata for list view
      const receiverId = chatId.replace(user.uid, '').replace('_', '');
      const participants = [user.uid, receiverId];

      await db.collection('chats').doc(chatId).set({
        lastMessage: mediaUrl ? `📷 ${mediaType === 'video' ? 'Video' : 'Photo'}` : textToSend,
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        lastMessageSenderId: user.uid,
        participants: participants,
        [`name_${user.uid}`]: userData?.displayName || 'Unknown',
        ...(chatName && chatName !== 'Chat' ? { [`name_${receiverId}`]: chatName } : {}),
        [`unreadCount_${receiverId}`]: firestore.FieldValue.increment(1)
      }, { merge: true });

      // Handle push notifications
      if (receiverId) {
        const receiverDoc = await db.collection('users').doc(receiverId).get();
        if (receiverDoc.exists) {
          const receiverData = receiverDoc.data();
          if (receiverData.pushToken) {
            await sendPushNotification(
              receiverData.pushToken,
              userData?.displayName || 'New Message',
              mediaUrl ? `📷 Sent a ${mediaType}` : textToSend,
              { chatId, chatName: userData?.displayName }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ImageBackground
        source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ opacity: 0.08 }}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => handleLongPressMessage(item)} activeOpacity={0.9}>
            <MessageBubble
              message={item}
              isMine={item.senderId === user?.uid}
            />
          </TouchableOpacity>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {isOtherTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>typing...</Text>
        </View>
      )}

      {isUploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color={Colors.secondary} />
          <Text style={styles.uploadingText}>Sending media...</Text>
        </View>
      )}

      <View style={styles.inputArea}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="happy-outline" size={24} color="#8696a0" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message"
            value={inputText}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity style={styles.iconBtn} onPress={pickMedia} disabled={isUploading}>
            <Ionicons name="attach" size={24} color="#8696a0" style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={pickMedia} disabled={isUploading}>
            <Ionicons name="camera" size={24} color="#8696a0" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => sendMessage()}
          disabled={isUploading}
        >
          <Ionicons
            name={inputText.length > 0 ? "send" : "mic"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    paddingVertical: 10,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    alignItems: 'center',
    paddingHorizontal: 5,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 120,
    fontSize: 17,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#000',
  },
  iconBtn: {
    padding: 8,
  },
  sendButton: {
    backgroundColor: Colors.secondary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  typingIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  typingText: {
    color: '#8696a0',
    fontSize: 14,
    fontStyle: 'italic',
  },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    backgroundColor: 'rgba(255,255,255,0.8)'
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 12,
    color: '#666'
  }
});

export default ChatRoomScreen;
