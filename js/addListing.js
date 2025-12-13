// js/addListing.js

// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your Config
const firebaseConfig = {
  apiKey: "AIzaSyCy5YAmmb1aTnWiXljQr3yOVsTKmYPAS08",
  authDomain: "pet-adoption-system-cf9f7.firebaseapp.com",
  projectId: "pet-adoption-system-cf9f7",
  storageBucket: "pet-adoption-system-cf9f7.firebasestorage.app",
  messagingSenderId: "615748560994",
  appId: "1:615748560994:web:465de9b90ac9208ec1493b",
  measurementId: "G-RZQDCB3V2C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Variables
let currentUser = null;
let base64ImageString = ""; // This will hold the converted image URL

// 2. CHECK AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
  } else {
    alert("Please login first.");
    window.location.href = "login.html";
  }
});

// 3. IMAGE HANDLER (Resize & Convert to Base64)
const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('previewImg');
const uploadText = document.getElementById('uploadText');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
        previewImg.src = event.target.result;
        previewImg.style.display = 'block';
        uploadText.style.display = 'none';
        
        // Compress image for Firestore (Must be < 1MB)
        resizeImage(event.target.result, 800, 0.7, (compressedDataUrl) => {
            base64ImageString = compressedDataUrl;
            console.log("Image processed. Length:", base64ImageString.length);
        });
    };
    reader.readAsDataURL(file);
});

// Helper: Resize Image using Canvas
function resizeImage(base64Str, maxWidth, quality, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Convert to reduced quality JPEG
        const newBase64 = canvas.toDataURL('image/jpeg', quality);
        callback(newBase64);
    };
}

// 4. SUBMIT FORM
document.getElementById('addListingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) return alert("You are not logged in.");
    
    // Disable button to prevent double click
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    try {
        const listingData = {
            name: document.getElementById("animalName").value,
            type: document.getElementById("animalType").value,
            breed: document.getElementById("animalBreed").value,
            gender: document.getElementById("animalGender").value,
            age: document.getElementById("animalAge").value,
            ageUnit: document.getElementById("animalAgeUnit").value,
            location: document.getElementById("animalLocation").value,
            vaccinationStatus: document.getElementById("animalVaccination").value,
            description: document.getElementById("animalDescription").value,
            
            // The magic "URL" (actually the image data)
            imageUrl: base64ImageString || "https://via.placeholder.com/150?text=No+Image",
            
            // Connect to User
            createdBy: currentUser.uid,
            ownerEmail: currentUser.email,
            
            createdAt: serverTimestamp(),
            status: "Available"
        };

        // Save to Firestore
        await addDoc(collection(db, "animals"), listingData);
        
        alert("Success! Animal listed.");
        window.location.href = "listing.html"; 

    } catch (error) {
        console.error(error);
        if (error.code === 'resource-exhausted') {
            alert("Error: Image is too big for the database. Please try a simpler photo.");
        } else {
            alert("Error saving: " + error.message);
        }
        submitBtn.innerText = "Submit Listing";
        submitBtn.disabled = false;
    }
});