import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Cast import.meta to any to avoid TypeScript errors regarding 'env' property when types are missing
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env?.VITE_FIREBASE_API_KEY || "AIzaSyDDlaIBAIiLbwUNt7F6DqoPwR7K0SY2qV8",
  authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN || "shareearn-cc69a.firebaseapp.com",
  projectId: env?.VITE_FIREBASE_PROJECT_ID || "shareearn-cc69a",
  storageBucket: env?.VITE_FIREBASE_STORAGE_BUCKET || "shareearn-cc69a.firebasestorage.app",
  messagingSenderId: env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "741124597838",
  appId: env?.VITE_FIREBASE_APP_ID || "1:741124597838:web:2729e953734f82d8dbbb1f"
};

// Check if firebase app is already initialized to avoid errors
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export default firebase;