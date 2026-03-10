import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import auth from '@react-native-firebase/auth';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync } from '../utils/notifications';

import Colors from '../constants/Colors';

const ProfileSetupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const { setUserData } = useAuth();

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      const pushToken = await registerForPushNotificationsAsync();

      const userData = {
        uid: auth().currentUser.uid,
        displayName: name,
        phoneNumber: auth().currentUser.phoneNumber,
        photoURL: `https://i.pravatar.cc/150?u=${auth().currentUser.uid}`,
        createdAt: new Date().toISOString(),
        pushToken: pushToken || null,
        privacyLockEnabled: false,
      };

      await setDoc(doc(db, 'users', auth().currentUser.uid), userData);
      setUserData(userData);
      navigation.replace('Main');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Info</Text>
      <Text style={styles.subtitle}>Please provide your name and an optional profile photo.</Text>

      <TouchableOpacity style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="camera" size={45} color="#fff" />
          <View style={styles.plusOverlay}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your name here"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={25}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSaveProfile}>
        <Text style={styles.buttonText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 22,
  },
  avatarContainer: {
    marginBottom: 40,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  plusOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.accent,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  inputContainer: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
    marginBottom: 60,
  },
  input: {
    fontSize: 20,
    paddingVertical: 12,
    textAlign: 'center',
    color: '#000',
  },
  button: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 45,
    paddingVertical: 14,
    borderRadius: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});

export default ProfileSetupScreen;
