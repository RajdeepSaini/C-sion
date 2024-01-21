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
firebase.initializeApp(firebaseConfig);
// Reference to the database
const database = firebase.database();

// Function to submit data
const headingElement = document.getElementById('heading');

// Function to submit data
function submitData() {
    const inputData = document.getElementById('dataInput').value;

    if (inputData.trim() !== '') {
        // Save the data to the database
        database.ref('data').set({
            text: inputData
        });

        alert('Data submitted successfully!');
    } else {
        alert('Please enter something before submitting.');
    }
}

// Listen for changes in the database and update the heading
database.ref('data').on('value', (snapshot) => {
    const data = snapshot.val();
    
    // Update the heading with the user's input
    if (data && data.text) {
        headingElement.innerText = data.text;
    }
});
