import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';

import TabNavigator from './TabNavigator';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import VideoCallingScreen from '../screens/VideoCallingScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import IncomingCallScreen from '../screens/IncomingCallScreen';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';

// import { doc, getDoc } from 'firebase/firestore';
import { nativeDb as db } from '../config/firebase';
import { sendPushNotification } from '../utils/notifications';
import LockScreen from '../screens/LockScreen';
import Colors from '../constants/Colors';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, userData, loading } = useAuth();
  const navigationRef = useRef();
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Handle AppState (Lock on background)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        userData?.privacyLockEnabled
      ) {
        setIsAppUnlocked(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [userData]);

  useEffect(() => {
    // Listener for when a notification is clicked/interacted with
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const { chatId, chatName, isCall, callType, callerName } = response.notification.request.content.data;

      if (isCall) {
        navigationRef.current?.navigate('IncomingCall', {
          chatId,
          callerName: callerName || 'WhatsApp Contact',
          callType: callType || 'video'
        });
      } else if (chatId) {
        navigationRef.current?.navigate('ChatRoom', { chatId, chatName });
      }
    });

    // Listener for when a notification is received (foreground)
    const notificationSub = Notifications.addNotificationReceivedListener(notification => {
      const { isCall, chatId, callerName, callType } = notification.request.content.data;
      if (isCall) {
        navigationRef.current?.navigate('IncomingCall', {
          chatId,
          callerName: callerName || 'WhatsApp Contact',
          callType: callType || 'video'
        });
      }
    });

    return () => {
      responseSub.remove();
      notificationSub.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Show LockScreen if enabled and not yet unlocked
  if (user && userData?.privacyLockEnabled && !isAppUnlocked) {
    return <LockScreen onUnlock={() => setIsAppUnlocked(true)} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : !userData ? (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={({ route, navigation }) => ({
                title: route.params?.chatName || 'Chat',
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: '#fff',
                headerRight: () => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{ marginRight: 20 }}
                      onPress={async () => {
                        navigation.navigate('VideoCalling', {
                          channelId: route.params.chatId,
                          callType: 'video'
                        });

                        // Notify the other user about the call
                        const receiverId = route.params.chatId.replace(user.uid, '').replace('_', '');
                        const receiverDoc = await db.collection('users').doc(receiverId).get();
                        if (receiverDoc.exists && receiverDoc.data().pushToken) {
                          await sendPushNotification(
                            receiverDoc.data().pushToken,
                            '🎥 Incoming Video Call',
                            `${userData?.displayName} is video calling you...`,
                            { chatId: route.params.chatId, isCall: true, callType: 'video', callerName: userData?.displayName }
                          );
                        }
                      }}
                    >
                      <Ionicons name="videocam" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginRight: 15 }}
                      onPress={async () => {
                        navigation.navigate('VideoCalling', {
                          channelId: route.params.chatId,
                          callType: 'audio'
                        });

                        // Notify the other user about the call
                        const receiverId = route.params.chatId.replace(user.uid, '').replace('_', '');
                        const receiverDoc = await db.collection('users').doc(receiverId).get();
                        if (receiverDoc.exists && receiverDoc.data().pushToken) {
                          await sendPushNotification(
                            receiverDoc.data().pushToken,
                            '📞 Incoming Audio Call',
                            `${userData?.displayName} is calling you...`,
                            { chatId: route.params.chatId, isCall: true, callType: 'audio', callerName: userData?.displayName }
                          );
                        }
                      }}
                    >
                      <Ionicons name="call" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="VideoCalling"
              component={VideoCallingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IncomingCall"
              component={IncomingCallScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
