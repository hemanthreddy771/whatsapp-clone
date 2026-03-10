import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

const LockScreen = ({ onUnlock }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    authenticate();
  }, []);

  const authenticate = async () => {
    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock WhatsApp',
        fallbackLabel: 'Enter Passcode',
      });

      if (result.success) {
        onUnlock();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={80} color="#075E54" />
      <Text style={styles.title}>WhatsApp Locked</Text>
      
      {isAuthenticating ? (
        <ActivityIndicator size="large" color="#25D366" style={{ marginTop: 30 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={authenticate}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
  },
  button: {
    marginTop: 40,
    backgroundColor: '#075E54',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LockScreen;
