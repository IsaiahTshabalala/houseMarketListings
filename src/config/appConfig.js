// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator} from 'firebase/storage';
import {getFirestore, connectFirestoreEmulator} from "firebase/firestore";
import { getAuth, connectAuthEmulator, browserSessionPersistence } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration: Live
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Set this variable to the value of 'local' when doing tests locally with the Emulator Suite.
let location = 'local';


// Get reference to the authentication service.
const auth = getAuth(app);


// Initialize Cloud Firestore and get a reference to the service.
const db =  getFirestore(app);

const storage = getStorage(app);

if (location === 'local') {
  // Connect to local Authentication emulator.
  connectAuthEmulator(auth, "http://127.0.0.1:9099");

  // Connect to the local Firestore emulator
  connectFirestoreEmulator(db, '127.0.0.1', 8080);

  // Point to the Storage emulator running on localhost.
  connectStorageEmulator(storage, "127.0.0.1", 9199);
} // if (location === 'local')

await auth.setPersistence(browserSessionPersistence);

function isSignedIn() {
  return auth.currentUser !== null
          && auth.currentUser.emailVerified === true
          && auth.currentUser.isAnonymous === false;
} // function isSignedIn()


export {db, storage, auth, isSignedIn};


