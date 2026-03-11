import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import { nativeDb, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import Colors from '../constants/Colors';

const ProfileEditScreen = ({ navigation }) => {
    const { userData, setUserData } = useAuth();
    const [name, setName] = useState(userData?.displayName || '');
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);

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
        try {
            const storageRef = storage.ref(`profile_images/${uid}`);
            await storageRef.putFile(uri);
            const downloadURL = await storageRef.getDownloadURL();
            return downloadURL;
        } catch (error) {
            console.error("Image upload failed:", error);
            throw error;
        }
    };

    const handleUpdateProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const user = auth().currentUser;
            const uid = user?.uid;

            let photoURL = userData?.photoURL;
            if (imageUri) {
                photoURL = await uploadProfileImage(imageUri, uid);
            }

            const updatedData = {
                ...userData,
                displayName: name,
                photoURL: photoURL,
            };

            await nativeDb.collection('users').doc(uid).update({
                displayName: name,
                photoURL: photoURL
            });

            setUserData(updatedData);
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Edit Profile</Text>

            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={loading}>
                <View style={styles.avatarPlaceholder}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.avatarImage} />
                    ) : (
                        <Image source={{ uri: userData?.photoURL || 'https://i.pravatar.cc/150' }} style={styles.avatarImage} />
                    )}
                    <View style={styles.plusOverlay}>
                        <Ionicons name="camera" size={20} color="#fff" />
                    </View>
                </View>
            </TouchableOpacity>

            <View style={styles.inputSection}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={setName}
                    maxLength={25}
                    editable={!loading}
                />
                <Text style={styles.helperText}>This is not a username. This name will be visible to your WhatsApp contacts.</Text>
            </View>

            <TouchableOpacity
                style={[styles.saveButton, loading && { opacity: 0.7 }]}
                onPress={handleUpdateProfile}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.primary,
        marginTop: 20,
        marginBottom: 30,
    },
    avatarContainer: {
        marginBottom: 40,
        position: 'relative',
    },
    avatarPlaceholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    avatarImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    plusOverlay: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: Colors.secondary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    inputSection: {
        width: '100%',
        marginBottom: 40
    },
    label: {
        fontSize: 14,
        color: Colors.secondary,
        fontWeight: 'bold',
        marginBottom: 5
    },
    input: {
        fontSize: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 10,
        color: '#000',
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 8
    },
    saveButton: {
        backgroundColor: Colors.accent,
        width: '100%',
        paddingVertical: 15,
        borderRadius: 5,
        alignItems: 'center',
        elevation: 3,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
});

export default ProfileEditScreen;
