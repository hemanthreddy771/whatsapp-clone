import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { nativeDb as db } from '../config/firebase';
import auth from '@react-native-firebase/auth';

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Create a specific channel for calls with extreme importance and wake-up settings
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500, 500, 500, 500, 500],
      lightColor: '#25D366',
      sound: 'default', // In a real app, you can use a custom audio file path
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // Hardcoding the Project ID for standalone builds ensures reliability
    const projectId = "c73748d0-5f0f-477a-b1dd-d6b3e2c49ae8";

    try {
      const response = await Notifications.getExpoPushTokenAsync({ projectId });
      token = response.data;
      console.log('Push token generated:', token);
    } catch (err) {
      console.log('Error getting push token with projectId, trying fallback...', err);
      try {
        const fallback = await Notifications.getExpoPushTokenAsync();
        token = fallback.data;
      } catch (innerErr) {
        console.log('Final fallback failed for token:', innerErr);
      }
    }

    // Save/Update the token to the user document in Firestore using Native SDK
    const currentUser = auth().currentUser;
    if (currentUser && token) {
      try {
        await db.collection('users').doc(currentUser.uid).set({
          pushToken: token,
          lastTokenSync: new Date().toISOString()
        }, { merge: true });
        console.log('Push token saved to Firestore for user:', currentUser.uid);
      } catch (dbErr) {
        console.log("Failed to save push token to Firestore", dbErr);
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
};

// Function to send a notification via Expo's Push API
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  if (!expoPushToken) {
    console.log("Aborted sending notification: No push token provided.");
    return;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high', // Critical for waking up Android devices
    channelId: data.isCall ? 'calls' : 'default',
    _displayInForeground: true, // Specific for older Expo versions compatibility
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const result = await response.json();
    console.log("Notification send result:", result);
  } catch (error) {
    console.error("Error calling Expo Push API:", error);
  }
};
