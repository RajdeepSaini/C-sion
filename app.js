// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC-9MC9X9UHZhV4CzJBG3g32aZcN75LFlI",
  authDomain: "c-sion.firebaseapp.com",
  databaseURL: "https://c-sion-default-rtdb.firebaseio.com",
  projectId: "c-sion",
  storageBucket: "c-sion.appspot.com",
  messagingSenderId: "398897723178",
  appId: "1:398897723178:web:a0043e5457460be1f59053",
  measurementId: "G-KWHTJ2JMMT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Get a reference to the Firestore database
const db = firebase.firestore();

// Function to submit user input
function submitMessage() {
    const userInput = document.getElementById('userInput').value;

    // Add user input to the Firestore database
    db.collection('messages').add({
        text: userInput,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then((docRef) => {
        console.log("Document written with ID: ", docRef.id);
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
    });

    // Update the header text immediately
    updateHeaderText(userInput);
}

// Function to update the header text
function updateHeaderText(text) {
    document.getElementById('headerText').innerText = text;
}

// Real-time listener to update header text for new messages
db.collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .onSnapshot((snapshot) => {
        snapshot.forEach((doc) => {
            updateHeaderText(doc.data().text);
        });
    });
