import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import MessageBubble from '../components/MessageBubble';
import { nativeDb as db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification } from '../utils/notifications';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ChatRoomScreen = ({ route, navigation }) => {
  const { chatId, chatName, chatPhoto } = route.params || { chatId: 'general_room', chatName: 'Chat' };
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { user, userData } = useAuth();
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [wallpaper, setWallpaper] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [reactionMessage, setReactionMessage] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const typingTimeoutRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    const loadWallpaper = async () => {
      const savedWallpaper = await AsyncStorage.getItem('chat_wallpaper');
      if (savedWallpaper) setWallpaper(savedWallpaper);
    };
    loadWallpaper();
  }, []);

  const handleVideoCall = async () => {
    if (!user || !chatId) return;
    const receiverId = chatId.replace(user.uid, '').replace('_', '');
    if (!receiverId) return;

    const receiverDoc = await db.collection('users').doc(receiverId).get();
    const receiverData = receiverDoc.exists ? receiverDoc.data() : { displayName: 'Unknown' };

    const callRef = await db.collection('calls').add({
      callerId: user.uid,
      callerName: userData?.displayName || 'Unknown',
      receiverId: receiverId,
      receiverName: receiverData.displayName || 'Unknown',
      type: 'video',
      status: 'outgoing',
      participants: [user.uid, receiverId],
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    navigation.navigate('VideoCalling', {
      channelId: chatId,
      callType: 'video',
      callDocId: callRef.id
    });

    if (receiverDoc.exists && receiverDoc.data().pushToken) {
      sendPushNotification(
        receiverDoc.data().pushToken,
        '📹 Incoming Video Call',
        `${userData?.displayName} is calling you...`,
        { chatId: chatId, isCall: true, callType: 'video', callerName: userData?.displayName }
      ).catch(() => { });
    }
  };

  const handleAudioCall = async () => {
    if (!user || !chatId) return;
    const receiverId = chatId.replace(user.uid, '').replace('_', '');
    if (!receiverId) return;

    const receiverDoc = await db.collection('users').doc(receiverId).get();
    const receiverData = receiverDoc.exists ? receiverDoc.data() : { displayName: 'Unknown' };

    const callRef = await db.collection('calls').add({
      callerId: user.uid,
      callerName: userData?.displayName || 'Unknown',
      receiverId: receiverId,
      receiverName: receiverData.displayName || 'Unknown',
      type: 'audio',
      status: 'outgoing',
      participants: [user.uid, receiverId],
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    navigation.navigate('VideoCalling', {
      channelId: chatId,
      callType: 'audio',
      callDocId: callRef.id
    });

    if (receiverDoc.exists && receiverDoc.data().pushToken) {
      sendPushNotification(
        receiverDoc.data().pushToken,
        '📞 Incoming Audio Call',
        `${userData?.displayName} is calling you...`,
        { chatId: chatId, isCall: true, callType: 'audio', callerName: userData?.displayName }
      ).catch(() => { });
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.headerAvatar}>
            {chatPhoto ? (
              <Image source={{ uri: chatPhoto }} style={styles.headerAvatarImg} />
            ) : (
              <Ionicons name="person" size={18} color="#fff" />
            )}
          </View>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{chatName}</Text>
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 20 }} onPress={handleVideoCall}>
            <Ionicons name="videocam" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginRight: 20 }} onPress={handleAudioCall}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginRight: 10 }} onPress={() => setIsMenuOpen(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )
    });
  }, [chatName, chatPhoto]);

  const pickWallpaper = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow gallery access to change wallpaper.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const tempUri = result.assets[0].uri;
      const filename = tempUri.split('/').pop();
      const permanentUri = FileSystem.documentDirectory + 'wallpaper_' + filename;
      try {
        await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
        await AsyncStorage.setItem('chat_wallpaper', permanentUri);
        setWallpaper(permanentUri);
        setIsMenuOpen(false);
        Alert.alert('Success', 'Chat wallpaper updated!');
      } catch (err) {
        console.log("Failed to save wallpaper", err);
      }
    }
  };

  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const unsubscribe = db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        if (snapshot) {
          const fetchedMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(fetchedMessages);

          // Mark unread messages from OTHER user as "delivered"
          snapshot.docs.forEach(doc => {
            const msg = doc.data();
            if (msg.senderId !== user.uid) {
              if (msg.status === 'sent') {
                doc.ref.update({ status: 'delivered' });
                // Also update chat metadata if this was the last message
                if (doc.id === fetchedMessages[0]?.id) {
                  db.collection('chats').doc(chatId).update({ lastMessageStatus: 'delivered' }).catch(() => { });
                }
              }
              // Mark as "read" since user is viewing
              if (msg.status === 'sent' || msg.status === 'delivered') {
                doc.ref.update({ status: 'read' });
                if (doc.id === fetchedMessages[0]?.id) {
                  db.collection('chats').doc(chatId).update({ lastMessageStatus: 'read' }).catch(() => { });
                }
              }
            }
          });
        }
      }, (err) => console.log("Message fetch error:", err));

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

    // Clear unread count
    if (user?.uid && chatId) {
      db.collection('chats').doc(chatId).set({
        [`unreadCount_${user.uid}`]: 0
      }, { merge: true }).catch(() => { });
    }

    return () => {
      unsubscribe();
      unsubscribeTyping();
    };
  }, [chatId, user?.uid]);

  const handleTextChange = (text) => {
    setInputText(text);
    if (!user?.uid || !chatId) return;

    db.collection('chats').doc(chatId).set({
      [`typing_${user.uid}`]: true
    }, { merge: true }).catch(() => { });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (user?.uid && chatId) {
        db.collection('chats').doc(chatId).set({
          [`typing_${user.uid}`]: false
        }, { merge: true }).catch(() => { });
      }
    }, 2000);
  };

  const handleLongPressMessage = (message) => {
    setReactionMessage(message);
  };

  const addReaction = async (message, emoji) => {
    try {
      await db.collection('chats').doc(chatId).collection('messages').doc(message.id).update({
        reaction: emoji
      });
      setReactionMessage(null);
    } catch (err) {
      console.log("Reaction error:", err);
    }
  };

  const deleteMessage = (message) => {
    setReactionMessage(null);
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            db.collection('chats').doc(chatId).collection('messages').doc(message.id)
              .delete().catch(() => Alert.alert('Error', 'Failed to delete'));
          }
        }
      ]
    );
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadMedia(result.assets[0].uri, result.assets[0].type || 'image');
    }
  };

  const uploadMedia = async (uri, type) => {
    setIsUploading(true);
    try {
      const filename = Date.now() + '_' + uri.substring(uri.lastIndexOf('/') + 1);
      const reference = storage.ref(`chats/${chatId}/${filename}`);
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

  const downloadMedia = async (url) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow storage access to save media.');
        return;
      }
      const filename = 'whatsapp_' + Date.now() + '.jpg';
      const fileUri = FileSystem.documentDirectory + filename;
      const download = await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Alert.alert('Saved!', 'Media saved to your gallery.');
    } catch (error) {
      Alert.alert('Error', 'Failed to download media.');
    }
  };

  const sendMessage = async (customText = null, mediaUrl = null, mediaType = null) => {
    const textToSend = customText !== null ? customText : inputText;
    if ((!textToSend || textToSend.trim() === '') && !mediaUrl) return;

    if (customText === null) {
      setInputText('');
    }

    try {
      const messageData = {
        text: textToSend || '',
        createdAt: firestore.FieldValue.serverTimestamp(),
        senderId: user.uid,
        senderName: userData?.displayName || 'Unknown',
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        status: 'sent', // Start as sent (grey single tick)
        replyTo: replyingTo ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName || 'Unknown',
          text: replyingTo.text || null,
          mediaType: replyingTo.mediaType || null,
        } : null,
      };

      setReplyingTo(null);

      await db.collection('chats').doc(chatId).collection('messages').add(messageData);

      const receiverId = chatId.replace(user.uid, '').replace('_', '');
      const participants = [user.uid, receiverId];

      await db.collection('chats').doc(chatId).set({
        lastMessage: mediaUrl ? (mediaType === 'video' ? '🎥 Video' : '📷 Photo') : textToSend,
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        lastMessageSenderId: user.uid,
        lastMessageStatus: 'sent',
        participants: participants,
        [`name_${user.uid}`]: userData?.displayName || 'Unknown',
        [`photo_${user.uid}`]: userData?.photoURL || null,
        ...(chatName && chatName !== 'Chat' ? { [`name_${receiverId}`]: chatName } : {}),
        ...(chatPhoto ? { [`photo_${receiverId}`]: chatPhoto } : {}),
        [`unreadCount_${receiverId}`]: firestore.FieldValue.increment(1)
      }, { merge: true });

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

  const renderMessage = ({ item }) => (
    <TouchableOpacity onLongPress={() => handleLongPressMessage(item)} activeOpacity={0.9}>
      <MessageBubble
        message={item}
        isMine={item.senderId === user?.uid}
        onMediaPress={(url, type) => setSelectedMedia({ url, type })}
        onDownload={(url) => downloadMedia(url)}
        onSwipeToReply={(msg) => setReplyingTo(msg)}
      />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ImageBackground
        source={{ uri: wallpaper || 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ opacity: wallpaper ? 1 : 0.08 }}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        inverted={true}
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
        {replyingTo && (
          <View style={styles.replyPreviewContainer}>
            <View style={styles.replyPreviewInner}>
              <Text style={styles.replyPreviewName}>{replyingTo.senderName}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyingTo.text || (replyingTo.mediaType === 'video' ? '🎥 Video' : '📷 Photo')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyPreviewClose}>
              <Ionicons name="close-circle" size={24} color="#8696a0" />
            </TouchableOpacity>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
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
            <Ionicons name={inputText.length > 0 ? "send" : "mic"} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Screen Media Viewer Modal */}
      <Modal visible={!!selectedMedia} transparent={true} animationType="fade" onRequestClose={() => setSelectedMedia(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedMedia(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedMedia && selectedMedia.type === 'video' ? (
            <Video
              style={styles.fullVideo}
              source={{ uri: selectedMedia.url }}
              useNativeControls
              resizeMode="contain"
              isLooping
              shouldPlay
            />
          ) : (
            selectedMedia && <Image source={{ uri: selectedMedia.url }} style={styles.fullImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.downloadBtn} onPress={() => { downloadMedia(selectedMedia.url); }}>
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 8 }}>Save to Gallery</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Message Options / Emoji Reactions Modal */}
      <Modal visible={!!reactionMessage} transparent={true} animationType="fade" onRequestClose={() => setReactionMessage(null)}>
        <TouchableOpacity style={styles.reactionOverlay} activeOpacity={1} onPress={() => setReactionMessage(null)}>
          <View style={styles.reactionContainer}>
            <View style={styles.emojiRow}>
              {['❤️', '👍', '😂', '😮', '😢', '🙏'].map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.emojiBtn} onPress={() => addReaction(reactionMessage, emoji)}>
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.menuOptions}>
              <TouchableOpacity style={styles.menuBtn} onPress={() => { setReplyingTo(reactionMessage); setReactionMessage(null); }}>
                <Ionicons name="arrow-undo-outline" size={20} color="#000" />
                <Text style={styles.menuBtnText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuBtn, { borderTopWidth: 0.5, borderTopColor: '#eee' }]} onPress={() => deleteMessage(reactionMessage)}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={[styles.menuBtnText, { color: '#FF3B30' }]}>Delete Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header Menu Modal */}
      <Modal visible={isMenuOpen} transparent={true} animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
          <View style={styles.headerMenuContainer}>
            <TouchableOpacity style={styles.headerMenuItem} onPress={pickWallpaper}>
              <Ionicons name="image-outline" size={20} color="#000" />
              <Text style={styles.headerMenuText}>Wallpaper</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerMenuItem} onPress={() => { setIsMenuOpen(false); pickMedia(); }}>
              <Ionicons name="attach" size={20} color="#000" />
              <Text style={styles.headerMenuText}>Attach Media</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContainer: { paddingVertical: 10, paddingBottom: 5 },
  headerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden'
  },
  headerAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  inputArea: {
    flexDirection: 'column', padding: 8, justifyContent: 'flex-end', backgroundColor: 'transparent',
  },
  replyPreviewContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5ddd5', borderRadius: 8, padding: 8, marginBottom: 5, borderLeftWidth: 4, borderLeftColor: Colors.secondary,
  },
  replyPreviewInner: { flex: 1 },
  replyPreviewName: { color: Colors.secondary, fontWeight: 'bold', fontSize: 13 },
  replyPreviewText: { color: '#666', fontSize: 13, marginTop: 2 },
  replyPreviewClose: { padding: 5, marginLeft: 5 },
  inputWrapper: {
    flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25,
    alignItems: 'center', paddingHorizontal: 5,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
  },
  input: {
    flex: 1, minHeight: 45, maxHeight: 120, fontSize: 17, paddingHorizontal: 10, paddingVertical: 10, color: '#000',
  },
  iconBtn: { padding: 8 },
  sendButton: {
    backgroundColor: Colors.secondary, width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },
  typingIndicator: { paddingHorizontal: 20, paddingVertical: 5 },
  typingText: { color: '#8696a0', fontSize: 14, fontStyle: 'italic' },
  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 5, backgroundColor: 'rgba(255,255,255,0.8)'
  },
  uploadingText: { marginLeft: 10, fontSize: 12, color: '#666' },
  modalContainer: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10,
  },
  fullImage: {
    width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7,
  },
  fullVideo: {
    width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7,
  },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25,
  },
  reactionOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  reactionContainer: {
    backgroundColor: '#fff', borderRadius: 20, width: '80%', overflow: 'hidden', padding: 10, elevation: 5,
  },
  emojiRow: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  emojiBtn: {
    padding: 8,
  },
  emojiText: { fontSize: 28 },
  menuOptions: { paddingVertical: 5 },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
  },
  menuBtnText: { marginLeft: 15, fontSize: 16, color: '#000' },
  menuOverlay: {
    flex: 1, backgroundColor: 'transparent',
  },
  headerMenuContainer: {
    position: 'absolute', top: 50, right: 10,
    backgroundColor: '#fff', borderRadius: 8, padding: 5, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
    minWidth: 150,
  },
  headerMenuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
  },
  headerMenuText: { marginLeft: 12, fontSize: 16, color: '#000' },
});

export default ChatRoomScreen;
