import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import Colors from '../constants/Colors';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('+91 ');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestOTP = async () => {
    const cleanNumber = phoneNumber.replace(/\s/g, '');
    if (!cleanNumber || cleanNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number with country code (e.g., +919876543210).');
      return;
    }

    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(cleanNumber);
      setConfirm(confirmation);
      Alert.alert('OTP Sent ✓', 'A 6-digit verification code has been sent to ' + cleanNumber);
    } catch (error) {
      console.error('OTP Error:', error);
      let message = 'Failed to send OTP. Please try again.';
      if (error.code === 'auth/invalid-phone-number') {
        message = 'Invalid phone number format. Use format: +919876543210';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please wait a few minutes and try again.';
      } else if (error.code === 'auth/quota-exceeded') {
        message = 'SMS quota exceeded. Please try again later.';
      }
      Alert.alert('Error', message);
    }
    setLoading(false);
  };

  const confirmOTP = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      await confirm.confirm(verificationCode);
      // Auth state listener in AuthContext will handle navigation automatically
    } catch (error) {
      console.error('Verification Error:', error);
      let message = 'Invalid verification code. Please try again.';
      if (error.code === 'auth/invalid-verification-code') {
        message = 'The OTP code you entered is incorrect. Please check and try again.';
      } else if (error.code === 'auth/session-expired') {
        message = 'The OTP has expired. Please request a new code.';
        setConfirm(null);
        setVerificationCode('');
      }
      Alert.alert('Verification Failed', message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!confirm ? (
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
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={requestOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>AGREE AND CONTINUE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.verifyTitle}>Verifying your number</Text>
            <Text style={styles.infoText}>
              Waiting to automatically detect an SMS sent to{' '}
              <Text style={{ fontWeight: 'bold' }}>{phoneNumber}</Text>.{' '}
              <Text style={styles.link} onPress={() => { setConfirm(null); setVerificationCode(''); }}>Wrong number?</Text>
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

            <TouchableOpacity
              style={[styles.button, { marginTop: 40 }, loading && styles.buttonDisabled]}
              onPress={confirmOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>VERIFY</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => { setConfirm(null); setVerificationCode(''); requestOTP(); }}
              disabled={loading}
            >
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>from</Text>
          <Text style={styles.footerBrand}>META</Text>
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resendButton: {
    marginTop: 20,
    padding: 10,
  },
  resendText: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '600',
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
