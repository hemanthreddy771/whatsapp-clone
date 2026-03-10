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
import { nativeDb as db } from '../config/firebase';
import auth from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

const ChatListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchNumber, setSearchNumber] = useState('+91 ');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Use Native SDK syntax for real-time listener
    const unsubscribe = db.collection('chats')
      .where('participants', 'array-contains', user.uid)
      .orderBy('lastMessageTime', 'desc')
      .onSnapshot((snapshot) => {
        if (snapshot) {
          const fetchedChats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setChats(fetchedChats);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching chats: ", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  const onInvite = async () => {
    try {
      await Share.share({
        message:
          'Hey! I am using this cool WhatsApp Clone app. Join me so we can chat securely! 🚀',
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSearchUser = async () => {
    // IMPORTANT: Remove ALL spaces and special characters for the search
    const cleanNumber = searchNumber.replace(/[^\d+]/g, '');

    if (cleanNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a full phone number including country code (e.g. +91...)');
      return;
    }

    setIsSearching(true);
    try {
      // Use Native SDK syntax for one-time fetch
      const querySnapshot = await db.collection('users')
        .where('phoneNumber', '==', cleanNumber)
        .get();

      if (querySnapshot.empty) {
        Alert.alert('Not Found', `No user found with number: ${cleanNumber}. They must register and set up their profile first.`);
      } else {
        const foundUser = querySnapshot.docs[0].data();
        if (foundUser.uid === auth().currentUser.uid) {
          Alert.alert('Note', 'This is your own number!');
        } else {
          navigation.navigate('ChatRoom', {
            chatId: [auth().currentUser.uid, foundUser.uid].sort().join('_'),
            chatName: foundUser.displayName
          });
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert('Error', 'Something went wrong during search: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const renderChatItem = ({ item }) => {
    // Native SDK toDate() helper for compatibility if available, or handle metadata
    const lastMessageTime = item.lastMessageTime?.toDate ? item.lastMessageTime.toDate() : null;
    const timeString = lastMessageTime ?
      lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('ChatRoom', {
          chatId: item.id,
          chatName: item.chatName
        })}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={30} color="#fff" />
          </View>
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.chatName || 'Unknown'}</Text>
            <Text style={styles.chatTime}>{timeString}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
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
            placeholder="Search phone number..."
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubbles-outline" size={60} color="#8696a0" />
            </View>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to start a new chat by phone number.
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#000',
  },
  searchButton: {
    backgroundColor: Colors.secondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f6f6f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  inviteButton: {
    marginTop: 30,
    backgroundColor: Colors.accent,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  inviteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default ChatListScreen;
