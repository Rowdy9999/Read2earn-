
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDDlaIBAIiLbwUNt7F6DqoPwR7K0SY2qV8",
  authDomain: "shareearn-cc69a.firebaseapp.com",
  projectId: "shareearn-cc69a",
  storageBucket: "shareearn-cc69a.firebasestorage.app",
  messagingSenderId: "741124597838",
  appId: "1:741124597838:web:2729e953734f82d8dbbb1f"
};

// Check if firebase app is already initialized to avoid errors
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export default firebase;
