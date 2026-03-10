import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import auth from '@react-native-firebase/auth';
import { nativeDb as db } from '../config/firebase';
// import { doc, updateDoc } from 'firebase/firestore';
import * as LocalAuthentication from 'expo-local-authentication';

const SettingsScreen = () => {
  const { userData, setUserData } = useAuth();
  const [isBiometricSupported, setIsBiometricSupported] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
    })();
  }, []);

  const handleTogglePrivacyLock = async (value) => {
    if (value) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert(
          'Biometrics Not Found',
          'Please set up Fingerprint or FaceID in your device settings first.'
        );
        return;
      }
    }

    try {
      await db.collection('users').doc(auth().currentUser.uid).update({
        privacyLockEnabled: value,
      });
      setUserData({ ...userData, privacyLockEnabled: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => auth().signOut().catch(err => Alert.alert('Error', err.message)),
          style: "destructive"
        }
      ]
    );
  };

  const Option = ({ icon, label, last = false, color = '#000', onPress, children }) => (
    <TouchableOpacity
      style={[styles.optionBtn, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      disabled={!!children}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Ionicons name={icon} size={24} color={color === '#000' ? '#075E54' : color} />
        <Text style={[styles.optionText, { color }]}>{label}</Text>
      </View>
      {children}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Image
          source={{ uri: userData?.photoURL || 'https://i.pravatar.cc/150' }}
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{userData?.displayName || 'User'}</Text>
          <Text style={styles.status}>Available</Text>
        </View>
      </View>

      {/* Settings Options */}
      <View style={styles.optionsContainer}>
        <Option icon="key-outline" label="Account" />
        <Option icon="chatbubbles-outline" label="Chats" />
        <Option icon="notifications-outline" label="Notifications" />

        {isBiometricSupported && (
          <Option icon="lock-closed-outline" label="Privacy Lock">
            <Switch
              value={userData?.privacyLockEnabled || false}
              onValueChange={handleTogglePrivacyLock}
              trackColor={{ false: "#767577", true: "#25D366" }}
              thumbColor="#f4f3f4"
            />
          </Option>
        )}

        <Option icon="help-circle-outline" label="Help" />
        <Option
          icon="log-out-outline"
          label="Logout"
          last={true}
          color="#d32f2f"
          onPress={handleLogout}
        />
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  profileSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  status: {
    color: 'gray',
    marginTop: 2,
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
  },
});

export default SettingsScreen;
