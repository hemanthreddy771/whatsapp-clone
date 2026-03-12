import React, { createContext, useState, useEffect, useContext } from 'react';
import auth from '@react-native-firebase/auth';
import { nativeDb as db } from '../config/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const engineRef = useRef(null);

  useEffect(() => {
    // Listen to native Firebase auth state changes
    const unsubscribe = auth().onAuthStateChanged(async (authenticatedUser) => {
      setUser(authenticatedUser);
      if (authenticatedUser) {
        // Fetch additional user data (name, avatar) from Firestore
        try {
          const userDoc = await db.collection('users').doc(authenticatedUser.uid).get();
          if (userDoc.exists) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, setUserData, activeCall, setActiveCall, engineRef }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
