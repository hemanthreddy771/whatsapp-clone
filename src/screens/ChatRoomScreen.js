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
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageBubble from '../components/MessageBubble';
import { nativeDb as db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification } from '../utils/notifications';
import firestore from '@react-native-firebase/firestore';

import Colors from '../constants/Colors';

const ChatRoomScreen = ({ route }) => {
  const { chatId, chatName } = route.params || { chatId: 'general_room', chatName: 'Chat' };
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const { user, userData } = useAuth();

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

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

  const sendMessage = async () => {
    if (inputText.trim() === '' || !user?.uid) return;

    const text = inputText;
    setInputText('');

    try {
      const messageData = {
        text: text,
        createdAt: firestore.FieldValue.serverTimestamp(),
        senderId: user.uid,
        senderName: userData?.displayName || 'Unknown',
      };

      // Add message via Native SDK
      await db.collection('chats').doc(chatId).collection('messages').add(messageData);

      // Update chat metadata for list view
      const receiverId = chatId.replace(user.uid, '').replace('_', '');
      const participants = [user.uid, receiverId];

      await db.collection('chats').doc(chatId).set({
        lastMessage: text,
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        lastMessageSenderId: user.uid,
        participants: participants,
        chatName: chatName,
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
              text,
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
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={item.senderId === user?.uid}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
      />

      {isOtherTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>typing...</Text>
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
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="attach" size={24} color="#8696a0" style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="camera" size={24} color="#8696a0" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
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
});

export default ChatRoomScreen;
