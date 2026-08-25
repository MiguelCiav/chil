import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRhmtHPH-W7X1bvWKencfxv7-gOLB5XUE",
  authDomain: "chil-2d600.firebaseapp.com",
  projectId: "chil-2d600",
  storageBucket: "chil-2d600.firebasestorage.app",
  messagingSenderId: "941642326953",
  appId: "1:941642326953:web:3334d5987cb9579d0edab8",
  measurementId: "G-FZ56YEC843"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

// Initialize Analytics conditionally (it requires browser environment and window.indexedDB)
export const analyticsPromise = isSupported().then((supported) => {
  if (supported) {
    return getAnalytics(app);
  }
  return null;
});
