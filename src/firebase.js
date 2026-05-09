// Firebase Configuration
// Replace these values with your actual Firebase project config
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, writeBatch, increment } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAaNQlYTd-BgZU5BynE_-mghLwaq4WP0mU",
  authDomain: "charitypools2.firebaseapp.com",
  projectId: "charitypools2",
  storageBucket: "charitypools2.firebasestorage.app",
  messagingSenderId: "94136540891",
  appId: "1:94136540891:web:b29dc503183f8fb8cbf6fe",
  measurementId: "G-9XX4GT4LTC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-export Firebase utilities
export {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, updateProfile,
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, writeBatch, increment
};
