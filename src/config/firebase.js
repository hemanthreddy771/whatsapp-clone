import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firestore from '@react-native-firebase/firestore';
import storage_module from '@react-native-firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyANDTitIPCumJNmNnflKM1ZE8KELsKd8dI",
  authDomain: "whatsapp-clone-7c929.firebaseapp.com",
  projectId: "whatsapp-clone-7c929",
  storageBucket: "whatsapp-clone-7c929.firebasestorage.app",
  messagingSenderId: "605263142610",
  appId: "1:605263142610:web:4e3dd99fc5b5ef5911170b",
  measurementId: "G-MNPXZ5HDNE"
};

// Initialize Firebase Web SDK for parts of the app that still use it
const app = initializeApp(firebaseConfig);

// Web SDK Firestore (used by old screens like ChatRoom)
export const db = getFirestore(app);

// Native SDK Firestore (used by Profile Setup to ensure Native Auth token is sent)
export const nativeDb = firestore();

// Native SDK Storage (avoids blob freezing issues)
export const storage = storage_module();
