import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import IncomingCallScreen from '../screens/IncomingCallScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import LockScreen from '../screens/LockScreen';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import messaging from '@react-native-firebase/messaging';
import { registerForPushNotificationsAsync, sendPushNotification } from '../utils/notifications';
import { nativeDb as db } from '../config/firebase';
import VideoCallingScreen from '../screens/VideoCallingScreen';
import firestore from '@react-native-firebase/firestore';

import Colors from '../constants/Colors';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, userData, loading } = useAuth();
  const navigationRef = useRef(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Register for push notifications securely
    registerForPushNotificationsAsync();

    // Foreground notification listener
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('Notification received in foreground:', remoteMessage);
      const data = remoteMessage.data || {};
      const { isCall, chatId, callerName, callType } = data;

      // If it's a call, we should show the incoming call screen immediately if the user is in the app
      if (isCall === 'true' && chatId) {
        navigationRef.current?.navigate('IncomingCall', {
          channelId: chatId,
          callerName: callerName || 'WhatsApp Contact',
          callType: callType || 'video'
        });
      }
    });

    // Handle user tapping on a notification while app is in background
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      const data = remoteMessage.data || {};
      const { chatId, isCall, callType, callerName, chatName } = data;

      if (isCall === 'true' && chatId) {
        navigationRef.current?.navigate('IncomingCall', {
          channelId: chatId,
          callType: callType || 'video',
          callerName: callerName || 'WhatsApp Contact'
        });
      } else if (chatId) {
        navigationRef.current?.navigate('ChatRoom', {
          chatId: chatId,
          chatName: chatName || 'Chat'
        });
      }
    });

    // Real-time Firestore listener for incoming calls (perfect for foreground state)
    const unsubscribeCalls = db.collection('calls')
      .where('receiverId', '==', user.uid)
      .where('status', '==', 'outgoing')
      .onSnapshot((snapshot) => {
        if (!snapshot || snapshot.empty) return;
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const callData = change.doc.data();
            navigationRef.current?.navigate('IncomingCall', {
              channelId: callData.participants.sort().join('_'),
              callType: callData.type || 'video',
              callerName: callData.callerName || 'Unknown',
              callDocId: change.doc.id
            });
          }
        });
      }, (err) => console.log('Call listener error:', err));

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeCalls();
    };
  }, [user]);

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ headerShown: false }} />
          </>
        ) : !userData ? (
          <>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ headerShown: false }} />
          </>
        ) : userData.privacyLockEnabled && !isUnlocked ? (
          <Stack.Screen name="Lock" options={{ headerShown: false }}>
            {() => <LockScreen onUnlock={() => setIsUnlocked(true)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={({ route, navigation }) => ({
                title: route.params?.chatName || 'Chat',
                headerRight: () => (
                  <View style={{ flexDirection: 'row', marginRight: 10 }}>
                    <TouchableOpacity
                      style={{ marginRight: 20 }}
                      onPress={async () => {
                        // Notify the other user about the call
                        const currentUser = user;
                        if (!currentUser) return;

                        const receiverId = (route.params?.chatId || '').replace(currentUser.uid, '').replace('_', '');
                        if (!receiverId) return;

                        const receiverDoc = await db.collection('users').doc(receiverId).get();
                        const receiverData = receiverDoc.exists ? receiverDoc.data() : { displayName: 'Unknown' };

                        // Log the call in history
                        const callRef = await db.collection('calls').add({
                          callerId: currentUser.uid,
                          callerName: userData?.displayName || 'Unknown',
                          receiverId: receiverId,
                          receiverName: receiverData.displayName || 'Unknown',
                          type: 'video',
                          status: 'outgoing',
                          participants: [currentUser.uid, receiverId],
                          createdAt: firestore.FieldValue.serverTimestamp(),
                        });

                        navigation.navigate('VideoCalling', {
                          channelId: route.params.chatId,
                          callType: 'video',
                          callDocId: callRef.id
                        });

                        if (receiverDoc.exists && receiverDoc.data().pushToken) {
                          sendPushNotification(
                            receiverDoc.data().pushToken,
                            '📹 Incoming Video Call',
                            `${userData?.displayName} is calling you...`,
                            { chatId: route.params.chatId, isCall: true, callType: 'video', callerName: userData?.displayName }
                          ).catch(() => { });
                        }
                      }}
                    >
                      <Ionicons name="videocam" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginRight: 15 }}
                      onPress={async () => {
                        const currentUser = user;
                        if (!currentUser) return;

                        const receiverId = (route.params?.chatId || '').replace(currentUser.uid, '').replace('_', '');
                        if (!receiverId) return;

                        const receiverDoc = await db.collection('users').doc(receiverId).get();
                        const receiverData = receiverDoc.exists ? receiverDoc.data() : { displayName: 'Unknown' };

                        // Log the call in history
                        const callRef = await db.collection('calls').add({
                          callerId: currentUser.uid,
                          callerName: userData?.displayName || 'Unknown',
                          receiverId: receiverId,
                          receiverName: receiverData.displayName || 'Unknown',
                          type: 'audio',
                          status: 'outgoing',
                          participants: [currentUser.uid, receiverId],
                          createdAt: firestore.FieldValue.serverTimestamp(),
                        });

                        navigation.navigate('VideoCalling', {
                          channelId: route.params.chatId,
                          callType: 'audio',
                          callDocId: callRef.id
                        });

                        if (receiverDoc.exists && receiverDoc.data().pushToken) {
                          sendPushNotification(
                            receiverDoc.data().pushToken,
                            '📞 Incoming Audio Call',
                            `${userData?.displayName} is calling you...`,
                            { chatId: route.params.chatId, isCall: true, callType: 'audio', callerName: userData?.displayName }
                          ).catch(() => { });
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
            <Stack.Screen
              name="ProfileEdit"
              component={ProfileEditScreen}
              options={{
                title: 'Profile Info',
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: '#fff',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
