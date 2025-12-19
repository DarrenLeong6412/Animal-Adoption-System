// js/addListing.js

// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Config
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
let base64ImageString = ""; // Stores the processed image data

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
    // Toggle Input visibility
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

    // Auto-detect existing category
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

        // Validating File Type 
        if (!file.type.startsWith('image/')) {
            alert("Please upload a valid image file (JPG, PNG).");
            fileInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewImg.style.display = 'block';
            uploadText.style.display = 'none';
            
            // Compress image for Firestore
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

// 5. SUBMIT FORM WITH STRICT VALIDATION
const form = document.getElementById('addListingForm');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        // VALIDATION CHECKING
        if (!currentUser) return alert("You are not logged in.");

        const submitBtn = document.getElementById("submitBtn");

    
        if (!base64ImageString) {
            alert("Photo Required: Please upload a photo of the animal to continue.");
            document.querySelector(".image-preview-container").style.borderColor = "#dc2626";
            return;
        } else {
            document.querySelector(".image-preview-container").style.borderColor = "#d1d5db";
        }

        const nameVal = document.getElementById("animalName").value.trim();
        const breedVal = document.getElementById("animalBreed").value.trim();
        const locVal = document.getElementById("animalLocation").value.trim();
        const descVal = document.getElementById("animalDescription").value.trim();
        
        const nameRegex = /^[a-zA-Z\s]+$/;

        if (nameVal.length < 1) {
            alert("Invalid Name: Please enter a name.");
            return;
        }

        if (!nameRegex.test(nameVal)) {
            alert("Invalid Name: Name must contain only alphabets (no numbers or symbols).");
            return;
        }

        if (locVal.length < 3) {
            alert("Invalid Location: Please provide a specific location.");
            return;
        }

        if (descVal.length < 10) {
            alert("Description too short: Please provide at least 10 characters describing the animal.");
            return;
        }

        const ageInput = document.getElementById("animalAge").value;
        const ageInt = parseInt(ageInput);

        if (isNaN(ageInt) || ageInt < 0) {
            alert("Invalid Age: Age cannot be negative.");
            return; 
        }
        if (ageInt > 300) { 
            alert("Invalid Age: Please check the age (value seems too high for months).");
            return;
        }

        let finalType = document.getElementById("animalType").value;
        
        if (finalType === "Other") {
            const customType = document.getElementById("animalTypeOther").value.trim();
            if (!customType) {
                alert("Missing Type: Please specify the animal type.");
                return;
            }
            finalType = customType.charAt(0).toUpperCase() + customType.slice(1);
        }

        // SUBMISSION
        submitBtn.innerText = "Saving...";
        submitBtn.disabled = true;

        try {
            const listingData = {
                name: nameVal,
                type: finalType, 
                breed: breedVal || "Unknown", 
                gender: document.getElementById("animalGender").value,
                age: ageInt.toString(), 
                ageUnit: "Months", 
                location: locVal,
                vaccinationStatus: document.getElementById("animalVaccination").value,
                description: descVal,
                
                imageUrl: base64ImageString, 
                
                // System Fields
                createdBy: currentUser.uid,
                ownerEmail: currentUser.email,
                createdAt: serverTimestamp(),
                status: "Pending",            
                approvedBy: null
            };

            await addDoc(collection(db, "animals"), listingData);
            
            alert("Success! Your listing has been submitted and is pending approval.");
            window.location.href = "listing.html"; 

        } catch (error) {
            console.error(error);
            if (error.code === 'resource-exhausted') {
                alert("Upload Failed: The image is too large. Please choose a smaller photo.");
            } else {
                alert("Error saving: " + error.message);
            }
            submitBtn.innerText = "Submit Listing";
            submitBtn.disabled = false;
        }
    });
}