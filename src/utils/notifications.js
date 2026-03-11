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
export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    console.log("Aborted sending notification: No push token provided.");
    return;
  }

  // To send real FCM from a client app without a custom backend, you typically use a Firebase Cloud function.
  // Assuming a cloud function endpoint exists:
  const payload = {
    to: fcmToken,
    notification: {
      title: title,
      body: body,
      sound: "default",
    },
    data: {
      ...data,
      priority: 'high',
    }
  };

  try {
    // Note: Due to security, you cannot use the FCM v1 HTTP API directly from the react-native client
    // without exposing your service account key. The app realistically needs a cloud function here.
    console.log("Mocking server request to Firebase FCM with payload:", payload);
  } catch (error) {
    console.error("Error calling FCM:", error);
  }
};
