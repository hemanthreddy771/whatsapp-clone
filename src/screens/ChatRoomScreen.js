import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageBubble from '../components/MessageBubble';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { sendPushNotification } from '../utils/notifications';

import Colors from '../constants/Colors';
import { ImageBackground } from 'react-native';

const ChatRoomScreen = ({ route }) => {
  const { chatId, chatName } = route.params || { chatId: 'general_room', chatName: 'Chat' };
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const { user, userData } = useAuth();

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetchedMessages);
    });

    // Listen for other user's typing status
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribeTyping = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const receiverId = chatId.replace(user.uid, '').replace('_', '');
        setIsOtherTyping(data[`typing_${receiverId}`] || false);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTyping();
    };
  }, [chatId]);

  const handleTextChange = (text) => {
    setInputText(text);

    // Update typing status in Firestore
    const chatRef = doc(db, 'chats', chatId);
    setDoc(chatRef, { [`typing_${user.uid}`]: true }, { merge: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setDoc(chatRef, { [`typing_${user.uid}`]: false }, { merge: true });
    }, 2000);
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;

    const text = inputText;
    setInputText('');

    try {
      const messageData = {
        text: text,
        createdAt: serverTimestamp(),
        senderId: user.uid,
        senderName: userData?.displayName || 'Unknown',
      };

      await addDoc(collection(db, `chats/${chatId}/messages`), messageData);

      // Update chat metadata for list view
      const receiverId = chatId.replace(user.uid, '').replace('_', '');
      const participants = [user.uid, receiverId];

      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        participants: participants,
        chatName: chatName, // Usually you'd store individual names per user, but for now this works
      }, { merge: true });

      const receiverDoc = await getDoc(doc(db, 'users', receiverId));

      if (receiverDoc.exists()) {
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
        imageStyle={{ opacity: 0.08 }} // Subtle pattern
      />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={item.senderId === user.uid}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
