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

let currentUser = null;
let base64ImageString = ""; 

// 2. CHECK AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
  } else {
    alert("Please login first.");
    window.location.href = "login.html";
  }
});

// 3. HANDLE "OTHER" ANIMAL TYPE LOGIC
const typeSelect = document.getElementById('animalType');
const otherInput = document.getElementById('animalTypeOther');

if (typeSelect && otherInput) {
    // Toggle Visibility
    typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'Other') {
            otherInput.style.display = 'block';
            otherInput.required = true;
            otherInput.focus();
        } else {
            otherInput.style.display = 'none';
            otherInput.required = false;
            otherInput.value = ''; 
        }
    });

    // Auto-Select Existing Options
    otherInput.addEventListener('input', () => {
        const typedVal = otherInput.value.trim().toLowerCase();
        for (let i = 0; i < typeSelect.options.length; i++) {
            const optionVal = typeSelect.options[i].value;
            if (optionVal === "Other") continue;

            if (optionVal.toLowerCase() === typedVal) {
                typeSelect.value = optionVal;
                otherInput.style.display = 'none';
                otherInput.value = '';
                otherInput.required = false;
                break;
            }
        }
    });
}

// 4. IMAGE HANDLER
const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('previewImg');
const uploadText = document.getElementById('uploadText');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewImg.style.display = 'block';
            uploadText.style.display = 'none';
            
            resizeImage(event.target.result, 800, 0.7, (compressedDataUrl) => {
                base64ImageString = compressedDataUrl;
            });
        };
        reader.readAsDataURL(file);
    });
}

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
        const newBase64 = canvas.toDataURL('image/jpeg', quality);
        callback(newBase64);
    };
}

// 5. SUBMIT FORM
const form = document.getElementById('addListingForm');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) return alert("You are not logged in.");
        
        // Validation: Age
        const ageValue = document.getElementById("animalAge").value;
        if (parseInt(ageValue) < 0) {
            alert("Age cannot be negative.");
            return; 
        }

        // Determine Final Type
        let finalType = document.getElementById("animalType").value;
        if (finalType === "Other") {
            const customType = document.getElementById("animalTypeOther").value.trim();
            if (!customType) {
                alert("Please specify the animal type.");
                return;
            }
            finalType = customType.charAt(0).toUpperCase() + customType.slice(1);
        }

        const submitBtn = document.getElementById("submitBtn");
        submitBtn.innerText = "Saving...";
        submitBtn.disabled = true;

        try {
            const listingData = {
                // User Input Fields
                name: document.getElementById("animalName").value,
                type: finalType,
                breed: document.getElementById("animalBreed").value,
                gender: document.getElementById("animalGender").value,
                age: ageValue,
                ageUnit: "Months", 
                location: document.getElementById("animalLocation").value,
                vaccinationStatus: document.getElementById("animalVaccination").value,
                description: document.getElementById("animalDescription").value,
                imageUrl: base64ImageString || "https://via.placeholder.com/150?text=No+Image",
                
                // System Fields
                createdBy: currentUser.uid,
                ownerEmail: currentUser.email,
                
                // --- NEW FIELDS FOR APPROVAL & DATE ---
                createdAt: serverTimestamp(), // Auto-server time
                status: "Pending",            // Needs approval
                approvedBy: null              // Admin ID (starts empty)
            };

            await addDoc(collection(db, "animals"), listingData);
            
            alert("Listing submitted successfully! It will appear after admin approval.");
            window.location.href = "listing.html"; 

        } catch (error) {
            console.error(error);
            submitBtn.innerText = "Submit Listing";
            submitBtn.disabled = false;
            alert("Error saving: " + error.message);
        }
    });
}