// javascript/lostPetForm.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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
let base64Image = "";

// Auth check
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Please login first to create a lost pet report.");
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  console.log("User logged in:", user.email);
});

// Animal Type Toggle
const animalTypeSelect = document.getElementById("animalType");
const otherGroup = document.getElementById("otherAnimalTypeGroup");
const animalTypeOtherInput = document.getElementById("animalTypeOther");

animalTypeSelect.addEventListener("change", function () {
  if (this.value === "Other") {
    otherGroup.style.display = "block";
    animalTypeOtherInput.required = true;
  } else {
    otherGroup.style.display = "none";
    animalTypeOtherInput.required = false;
    animalTypeOtherInput.value = "";
  }
});

// Image Upload Preview
const fileInput = document.getElementById("petPhoto");
const previewImg = document.getElementById("previewImg");
const uploadText = document.getElementById("uploadText");

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please upload a valid image file (JPG, PNG).");
    fileInput.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert("Image size must be less than 2MB.");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    previewImg.src = event.target.result;
    previewImg.style.display = "block";
    uploadText.style.display = "none";
    base64Image = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Form Submit
const form = document.getElementById("createLostPetForm");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  const name = document.getElementById("petName").value.trim();
  const ageInput = document.getElementById("petAge").value;
  const age = ageInput ? parseInt(ageInput) : null;
  const gender = document.getElementById("petGender").value;

  let animal_type = document.getElementById("animalType").value;
  if (animal_type === "Other") {
    const otherType = document.getElementById("animalTypeOther").value.trim();
    if (!otherType) {
      alert("Please specify the animal type.");
      return;
    }
    animal_type = otherType;
  }

  const breed = document.getElementById("petBreed").value.trim();
  const description = document.getElementById("petDescription").value.trim();
  const last_seen_Location = document.getElementById("lastSeenLocation").value.trim();
  const last_seen_Date = document.getElementById("lastSeenDate").value;

  if (!name || !animal_type || !gender || !description || !last_seen_Location || !last_seen_Date) {
    alert("Please fill in all required fields.");
    return;
  }

  if (!base64Image) {
    alert("Please upload a photo of the pet.");
    return;
  }

  // Show confirmation with reminder
  const confirmMessage = `Please review your lost pet report:

Pet Name: ${name}
Type: ${animal_type}
Last Seen: ${last_seen_Location} on ${last_seen_Date}

⚠️ IMPORTANT: Once submitted, you cannot edit the details yourself. If you need to make changes after submission, please contact us at our support email.

Do you want to submit this report?`;

  if (!confirm(confirmMessage)) {
    return;
  }

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    await addDoc(collection(db, "lostPets"), {
      user_id: currentUser.uid,
      name,
      age,
      gender,
      animal_type,
      breed: breed || null,
      description,
      photo: base64Image,
      last_seen_Location,
      last_seen_Date,
      verified_By: null,
      verification_status: "Pending", // For admin approval
      date_Reported: serverTimestamp()
    });

    alert("Lost pet report submitted successfully! Your report is pending admin approval.");
    window.location.href = "profile.html";
  } catch (err) {
    console.error("Error submitting report:", err);
    alert("Failed to submit report. Please try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
});