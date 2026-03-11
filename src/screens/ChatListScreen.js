import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  FlatList,
  Image,
  Share
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { nativeDb as db } from '../config/firebase';
import auth from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

const ChatListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchNumber, setSearchNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = db.collection('chats')
      .where('participants', 'array-contains', user.uid)
      .onSnapshot((snapshot) => {
        if (snapshot) {
          let fetchedChats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          fetchedChats.sort((a, b) => {
            const timeA = a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : 0;
            const timeB = b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : 0;
            return timeB - timeA;
          });

          setChats(fetchedChats);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching chats: ", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user?.uid, isFocused]);

  const onInvite = async () => {
    try {
      await Share.share({
        message: 'Hey! I am using this cool WhatsApp Clone app. Join me! 🚀',
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSearchUser = async () => {
    // Clean the number: remove spaces, dashes, brackets
    let cleanNumber = searchNumber.replace(/[\s\-\(\)]/g, '');

    // Auto-add +91 if user typed just digits starting with a digit
    if (cleanNumber && !cleanNumber.startsWith('+')) {
      cleanNumber = '+91' + cleanNumber;
    }

    if (cleanNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number (e.g. 9876543210 or +919876543210)');
      return;
    }

    console.log("Searching for:", cleanNumber);

    setIsSearching(true);
    try {
      const querySnapshot = await db.collection('users')
        .where('phoneNumber', '==', cleanNumber)
        .get();

      if (querySnapshot.empty) {
        Alert.alert('Not Found', `No user found with number: ${cleanNumber}.\nThey must register first.`);
      } else {
        const foundUser = querySnapshot.docs[0].data();
        if (foundUser.uid === auth().currentUser.uid) {
          Alert.alert('Note', 'This is your own number!');
        } else {
          const chatId = [auth().currentUser.uid, foundUser.uid].sort().join('_');
          navigation.navigate('ChatRoom', {
            chatId: chatId,
            chatName: foundUser.displayName,
            chatPhoto: foundUser.photoURL
          });
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert('Error', 'Something went wrong: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLongPressChat = (chatId) => {
    Alert.alert(
      'Delete Chat',
      'Do you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            db.collection('chats').doc(chatId).delete()
              .catch(err => Alert.alert('Error', 'Failed to delete chat'));
          }
        }
      ]
    );
  };

  const renderChatItem = ({ item }) => {
    let timeString = '';
    if (item.lastMessageTime) {
      try {
        const date = item.lastMessageTime.toDate ? item.lastMessageTime.toDate() : new Date(item.lastMessageTime);
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) { }
    }

    const otherParticipantId = (item.participants || []).find(id => id !== user?.uid);
    const displayName = item[`name_${otherParticipantId}`] || item.chatName || 'Unknown';
    const profilePhoto = item[`photo_${otherParticipantId}`];
    const unreadCount = item[`unreadCount_${user.uid}`] || 0;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('ChatRoom', {
          chatId: item.id,
          chatName: displayName,
          chatPhoto: profilePhoto
        })}
        onLongPress={() => handleLongPressChat(item.id)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={30} color="#fff" />
            )}
          </View>
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
            <Text style={[styles.chatTime, unreadCount > 0 && { color: Colors.secondary, fontWeight: 'bold' }]}>
              {timeString}
            </Text>
          </View>
          <View style={styles.chatBody}>
            <Text style={[styles.lastMessage, unreadCount > 0 && { color: '#000', fontWeight: '500' }]} numberOfLines={1}>
              {item.lastMessage || 'No messages yet...'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCountText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && chats.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8696a0" style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter phone number..."
            value={searchNumber}
            onChangeText={setSearchNumber}
            keyboardType="phone-pad"
            placeholderTextColor="#8696a0"
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearchUser}>
          {isSearching ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={28} color="#fff" />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        extraData={isFocused}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubbles-outline" size={60} color="#8696a0" />
            </View>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySubtitle}>
              Enter a number and tap + to start a chat.
            </Text>
            <TouchableOpacity style={styles.inviteButton} onPress={onInvite}>
              <Text style={styles.inviteText}>INVITE FRIENDS</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchHeader: {
    flexDirection: 'row', padding: 12, backgroundColor: '#fff', alignItems: 'center',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', height: 40, backgroundColor: '#f0f2f5',
    borderRadius: 20, alignItems: 'center', marginRight: 10,
  },
  searchInput: {
    flex: 1, height: '100%', paddingHorizontal: 10, fontSize: 15, color: '#000',
  },
  searchButton: {
    backgroundColor: Colors.secondary, width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },
  chatItem: {
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, alignItems: 'center',
  },
  avatarContainer: { marginRight: 15 },
  avatarPlaceholder: {
    width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#ccc',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  chatInfo: {
    flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0', paddingBottom: 12,
  },
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4,
  },
  chatBody: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  chatName: { fontSize: 17, fontWeight: '600', color: '#000', flex: 1 },
  chatTime: { fontSize: 12, color: '#666' },
  lastMessage: { fontSize: 14, color: '#666', flex: 1 },
  unreadBadge: {
    backgroundColor: Colors.secondary, minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 5,
  },
  unreadCountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 100,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#f6f6f6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10 },
  inviteButton: {
    marginTop: 30, backgroundColor: Colors.accent, paddingHorizontal: 25, paddingVertical: 12,
    borderRadius: 25, elevation: 2,
  },
  inviteText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
});

export default ChatListScreen;
