/**
 * File: ./src/config/appConfig.js
 * Description:
 * Firestore app configuration.
 * 
 * Date         Dev  Version   Description
 * 2023/07/26   ITA  1.00      Genesis.
 * 2024/06/20   ITA  1.01      Added a new .env variable named location. When set to 'local',
 *                             the web app will connect local emulators, which must be set up on the local desktop.
 *                             Otherwise the application will connect to the Firebase instance.
 *                             Added a function to determining if a logged in user has a moderator role.
 * 2024/07/20   ITA  1.02      Added measurement Id as one of the firebaseConfig fields.
 */
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
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Set this variable to the value of 'local' when doing tests locally with the Emulator Suite.
const location = process.env.REACT_APP_LOCATION;


// Get reference to the authentication service.
const auth = getAuth(app);


// Initialize Cloud Firestore and get a reference to the service.
const db = getFirestore(app);

const storage = getStorage(app);

if (location === 'local') { // Setup options to use Firebase local emulators instead of Google Firebase.
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

async function isModerator() {
    if (!isSignedIn())
        return false;

    const tokenResult = await auth?.currentUser?.getIdTokenResult();
    return (tokenResult?.claims?.moderator === true);
} // async function isModerator()


export {db, storage, auth, isSignedIn, isModerator};


