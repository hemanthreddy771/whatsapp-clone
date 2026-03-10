import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDV2c0G_k3bChtZxlBLnmJzRJoIU0vfnFM",
  authDomain: "whatsapp-clone-7c929.firebaseapp.com",
  projectId: "whatsapp-clone-7c929",
  storageBucket: "whatsapp-clone-7c929.firebasestorage.app",
  messagingSenderId: "605263142610",
  appId: "1:605263142610:web:4e3dd99fc5b5ef5911170b",
  measurementId: "G-MNPXZ5HDNE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
