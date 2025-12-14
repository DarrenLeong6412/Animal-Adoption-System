// js/adoptionForm.js

// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase Config (same project)
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

// 2. GLOBAL VARIABLES
let currentUser = null;
let base64EnvironmentImage = "";

// 3. AUTH CHECK
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
  } else {
    alert("Please login first.");
    window.location.href = "login.html";
  }
});

// 4. GET LISTING ID FROM URL
const params = new URLSearchParams(window.location.search);
const listingID = params.get("listingID");

document.getElementById("listingID").value = listingID;

// 5. IMAGE HANDLER (SAME LOGIC AS addListing.js)
const fileInput = document.getElementById("environmentPhoto");
const previewImg = document.getElementById("previewImg");
const uploadText = document.getElementById("uploadText");

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    previewImg.src = event.target.result;
    previewImg.style.display = "block";
    uploadText.style.display = "none";

    // Resize & compress
    resizeImage(event.target.result, 800, 0.7, (compressed) => {
      base64EnvironmentImage = compressed;
      console.log("Environment image ready. Length:", base64EnvironmentImage.length);
    });
  };
  reader.readAsDataURL(file);
});

// Helper: Resize image
function resizeImage(base64Str, maxWidth, quality, callback) {
  const img = new Image();
  img.src = base64Str;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = img.height * scale;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const compressed = canvas.toDataURL("image/jpeg", quality);
    callback(compressed);
  };
}

// 6. SUBMIT FORM
document.getElementById("adoptionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) return alert("You are not logged in.");

  const reason = document.getElementById("reason").value.trim();
  const environmentDesc = document.getElementById("environmentDesc").value.trim();

  if (!reason || !environmentDesc) {
    alert("Please fill in all required fields.");
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.innerText = "Submitting...";
  submitBtn.disabled = true;

  try {
    const requestData = {
      user_ID: currentUser.uid,
      userEmail: currentUser.email,

      listing_ID: listingID,

      reason,
      environmentDesc,

      // Admin-only data
      environmentPhoto: base64EnvironmentImage || "",

      status: "pending",
      dateApplied: serverTimestamp()
    };

    await addDoc(collection(db, "requests"), requestData);

    alert("Adoption request submitted successfully!");
    window.location.href = "listing.html";

  } catch (error) {
    console.error(error);
    alert("Error submitting request: " + error.message);
    submitBtn.innerText = "Submit Request";
    submitBtn.disabled = false;
  }
});
