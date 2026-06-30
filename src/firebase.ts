import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  "projectId": "moukaeritaid",
  "appId": "1:1042140630327:web:190d2eb8fd09b7686b9eb2",
  "apiKey": "AIzaSyC-rNdm8sXy3WOUnMA2GelyXLft0Mjebog",
  "authDomain": "moukaeritaid.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-55093787-0997-4229-9cde-05379b567907",
  "storageBucket": "moukaeritaid.firebasestorage.app",
  "messagingSenderId": "1042140630327",
  "measurementId": ""
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
