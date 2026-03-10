import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import Colors from '../constants/Colors';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('+91 ');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);

  const requestOTP = async () => {
    const cleanNumber = phoneNumber.trim();
    if (!cleanNumber || cleanNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number with country code.');
      return;
    }
    
    setVerificationId('simulated-' + Date.now());
    Alert.alert('Verification', 'A 6-digit code has been sent to ' + cleanNumber + ' (Simulated for Build Stability)');
  };

  const confirmOTP = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP code.');
      return;
    }

    try {
      // In this version, we use Anonymous Auth for the "Container" while we wait for JS Bundle stability
      // but we will still save user info to your real Firestore database!
      await signInAnonymously(auth);
      // AuthContext will handle the session
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!verificationId ? (
          <View style={styles.content}>
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png' }} 
              style={styles.logo} 
            />
            <Text style={styles.title}>Welcome to WhatsApp</Text>
            <Text style={styles.subtitle}>
              Read our <Text style={styles.link}>Privacy Policy</Text>. Tap "Agree and continue" to accept the <Text style={styles.link}>Terms of Service</Text>.
            </Text>

            <View style={styles.inputSection}>
              <View style={styles.phoneInputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="+91 00000-00000"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
              <TouchableOpacity style={styles.button} onPress={requestOTP}>
                <Text style={styles.buttonText}>AGREE AND CONTINUE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.verifyTitle}>Verifying your number</Text>
            <Text style={styles.infoText}>
              Waiting to automatically detect an SMS sent to{' '}
              <Text style={{ fontWeight: 'bold' }}>{phoneNumber}</Text>.{' '}
              <Text style={styles.link} onPress={() => setVerificationId(null)}>Wrong number?</Text>
            </Text>
            
            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="--- ---"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
                value={verificationCode}
                onChangeText={setVerificationCode}
                autoFocus
              />
            </View>
            
            <Text style={styles.hintText}>Enter 6-digit code</Text>
            
            <TouchableOpacity style={[styles.button, { marginTop: 40 }]} onPress={confirmOTP}>
              <Text style={styles.buttonText}>NEXT</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>from</Text>
          <Text style={styles.footerBrand}>FACEBOOK</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    paddingTop: 80,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 60,
  },
  link: {
     color: '#34B7F1',
  },
  inputSection: {
    width: '100%',
    alignItems: 'center',
  },
  phoneInputRow: {
    width: '100%',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.secondary,
    marginBottom: 50,
  },
  input: {
    width: '100%',
    height: 50,
    fontSize: 22,
    textAlign: 'center',
    color: '#000',
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  otpContainer: {
    width: '60%',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.secondary,
  },
  otpInput: {
    fontSize: 32,
    textAlign: 'center',
    paddingVertical: 10,
    letterSpacing: 8,
    color: '#000',
  },
  hintText: {
    marginTop: 15,
    color: '#8696a0',
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.accent,
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#8696a0',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footerBrand: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginTop: 5,
  },
});

export default LoginScreen;
