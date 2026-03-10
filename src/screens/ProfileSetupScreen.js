import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import { nativeDb, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import * as ImagePicker from 'expo-image-picker';

import Colors from '../constants/Colors';

const ProfileSetupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setUserData } = useAuth();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (uri, uid) => {
    if (!uri) return `https://i.pravatar.cc/150?u=${uid}`;

    try {
      const storageRef = storage.ref(`profile_images/${uid}`);
      await storageRef.putFile(uri);
      const downloadURL = await storageRef.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error("Image upload failed:", error);
      return `https://i.pravatar.cc/150?u=${uid}`;
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // Don't let push notification failure break the profile setup
      let pushToken = null;
      try {
        pushToken = await registerForPushNotificationsAsync();
      } catch (pushErr) {
        console.log("Push token error:", pushErr);
      }

      const user = auth().currentUser;
      const uid = user?.uid;
      const phoneNumber = user?.phoneNumber || '';

      if (!uid) {
        Alert.alert('Error', 'User authentication error. Please restart the app.');
        setLoading(false);
        return;
      }

      console.log('Uploading image...');
      const photoURL = await uploadProfileImage(imageUri, uid);

      const userData = {
        uid: uid,
        displayName: name,
        phoneNumber: phoneNumber,
        photoURL: photoURL,
        createdAt: new Date().toISOString(),
        pushToken: pushToken || null,
        privacyLockEnabled: false,
      };

      console.log('Saving profile data to Firestore...');
      await nativeDb.collection('users').doc(uid).set(userData);

      console.log('Profile saved successfully, navigating to Main');
      setUserData(userData);
      // Removed navigation.replace because AppNavigator reacts to userData being set
    } catch (error) {
      console.error("Profile saving error:", error);
      Alert.alert('Error', 'Failed to save profile: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Info</Text>
      <Text style={styles.subtitle}>Please provide your name and an optional profile photo.</Text>

      <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={loading}>
        <View style={styles.avatarPlaceholder}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="camera" size={45} color="#fff" />
          )}
          <View style={styles.plusOverlay}>
            <Ionicons name={imageUri ? "pencil" : "add"} size={16} color="#fff" />
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
          autoFocus={!loading}
          maxLength={25}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleSaveProfile}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>NEXT</Text>
        )}
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
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#DFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  plusOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 5,
    backgroundColor: Colors.accent,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
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
