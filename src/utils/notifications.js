import messaging from '@react-native-firebase/messaging';
import auth from '@react-native-firebase/auth';
import { nativeDb as db } from '../config/firebase';
import { Platform, PermissionsAndroid } from 'react-native';

export const registerForPushNotificationsAsync = async () => {
  let token;

  if (Platform.OS === 'android') {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      const authStatus = await messaging().requestPermission();

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        // Get native FCM token directly
        token = await messaging().getToken();
        console.log('FCM Token:', token);

        // Save token to firestore for user
        const currentUser = auth().currentUser;
        if (currentUser && token) {
          await db.collection('users').doc(currentUser.uid).set({
            pushToken: token,
            lastTokenSync: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (error) {
      console.log('Failed to get FCM token:', error);
    }
  }

  return token;
};

// Function to send FCM Data message directly via an edge function or mock endpoint
// Note: Direct client-to-client FCM HTTP v1 calls require a secure backend because sending requires the Service Account key.
// We are mimicking a server call payload here that a real backend would process.
// Function to send FCM Data message directly
export const sendPushNotification = async (fcmToken, title, body, extraData = {}) => {
  if (!fcmToken) {
    console.log("Aborted sending notification: No push token provided.");
    return;
  }

  // Convert all boolean values to strings for FCM Data compatibility
  const stringifiedData = {};
  Object.keys(extraData).forEach(key => {
    stringifiedData[key] = String(extraData[key]);
  });

  const payload = {
    to: fcmToken,
    notification: {
      title: title,
      body: body,
      sound: "default",
      android_channel_id: "default",
    },
    data: {
      ...stringifiedData,
      title: title,
      body: body,
    },
    priority: 'high',
  };

  try {
    // For this to work directly from the client, you need your FCM Server Key.
    // Replace 'YOUR_SERVER_KEY' with the key from your Firebase Console
    // (Project Settings -> Cloud Messaging -> Legacy API -> Server Key)
    const SERVER_KEY = 'AAAAG5y2JvQ:APA91bF8_8_R_i_i_i_i_i_i_i_i_i'; // MOCK - USER NEEDS TO UPDATE THIS

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${SERVER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("FCM response:", result);
    return result;
  } catch (error) {
    console.error("Error calling FCM:", error);
  }
};
