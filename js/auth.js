// js/auth.js
// ============== FIREBASE CORE ==============
import { initializeApp } 
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import { getAnalytics } 
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCy5YAmmb1aTnWiXljQr3yOVsTKmYPAS08",
  authDomain: "pet-adoption-system-cf9f7.firebaseapp.com",
  projectId: "pet-adoption-system-cf9f7",
  storageBucket: "pet-adoption-system-cf9f7.firebasestorage.app",
  messagingSenderId: "615748560994",
  appId: "1:615748560994:web:465de9b90ac9208ec1493b",
  measurementId: "G-RZQDCB3V2C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Protect against Analytics crash when local
try {
  getAnalytics(app);
} catch (e) {
  console.log("Analytics not available here:", e);
}

const auth = getAuth(app);
const db   = getFirestore(app);

// optional for debugging
window.auth = auth;
window.db   = db;

// ============== "REPOSITORY" LAYER ==============
// Talks directly to Firestore
function generateUserId() {
  // VARCHAR(5), format U + 4 digits (U0000–U9999)
  const num = Math.floor(Math.random() * 10000);
  return "U" + num.toString().padStart(4, "0");
}

async function saveUserProfileToFirestore(firebaseUser, formData) {
  const {
    fullName,
    gender,
    identificationNumber,
    phoneNumber,
    address
  } = formData;

  const userRef = doc(db, "users", firebaseUser.uid);

  const userData = {
    // USER(user_ID, username, email, password, gender,
    //      identification_Number, role, phone_Number, address)
    user_ID: generateUserId(),                 // VARCHAR(5), U+4 digits
    username: fullName || "",
    email: firebaseUser.email,
    password: null,                            // NOT storing plain password
    gender: gender || null,
    identification_Number: identificationNumber || null,
    role: "User",                              // default, NOT NULL
    phone_Number: phoneNumber || null,
    address: address || null,

    // extra meta
    createdAt: new Date().toISOString(),
    authProvider: "password",
    firebaseUid: firebaseUser.uid
  };

  await setDoc(userRef, userData);
}

// ============== "USE CASE" LAYER ==============
// Business logic + (simple) validation
function validateSignupData({
  fullName,
  email,
  password,
  gender,
  identificationNumber,
  phoneNumber,
  address
}) {
  const errors = [];

  // username (fullName) – NOT NULL, VARCHAR(50)
  if (!fullName || fullName.trim().length === 0) {
    errors.push("Full Name is required.");
  } else if (fullName.length > 50) {
    errors.push("Full Name must not exceed 50 characters.");
  }

  // email – NOT NULL, VARCHAR(100), valid format
  if (!email || email.trim().length === 0) {
    errors.push("Email is required.");
  } else if (email.length > 100) {
    errors.push("Email must not exceed 100 characters.");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push("Email format is invalid.");
    }
  }

  // password – NOT NULL, VARCHAR(255)
  if (!password || password.length === 0) {
    errors.push("Password is required.");
  } else if (password.length > 255) {
    errors.push("Password must not exceed 255 characters.");
  }

  // gender – CHAR(1) M/F/O – nullable
  if (gender && !["M", "F", "O"].includes(gender)) {
    errors.push("Gender must be M, F, or O.");
  }

  // identification_Number – VARCHAR(20) – nullable
  if (identificationNumber) {
    if (identificationNumber.length > 20) {
      errors.push("Identification Number must not exceed 20 characters.");
    }
    const idRegex = /^[A-Za-z0-9\-]+$/;
    if (!idRegex.test(identificationNumber)) {
      errors.push("Identification Number can only contain letters, numbers, and dashes.");
    }
  }

  // phone_Number – VARCHAR(15) – nullable
  if (phoneNumber) {
    if (phoneNumber.length > 15) {
      errors.push("Phone Number must not exceed 15 characters.");
    }
    const phoneRegex = /^[0-9+\-\s]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      errors.push("Phone Number can only contain digits, spaces, '+', and '-'.");
    }
  }

  // address – VARCHAR(255) – nullable
  if (address && address.length > 255) {
    errors.push("Address must not exceed 255 characters.");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

async function registerUserInDatabase(firebaseUser, formData) {
  // validate according to your data dictionary
  validateSignupData({
    fullName: formData.fullName,
    email: firebaseUser.email,
    password: formData.password,
    gender: formData.gender,
    identificationNumber: formData.identificationNumber,
    phoneNumber: formData.phoneNumber,
    address: formData.address
  });

  // save to Firestore via "repository"
  await saveUserProfileToFirestore(firebaseUser, formData);
}

// ============== "UI" LAYER ==============
// SIGN UP HANDLER
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const fullName = document.getElementById("signupName")?.value.trim() || "";
    const gender = document.getElementById("signupGender")?.value || "";
    const identificationNumber = document.getElementById("signupIC")?.value.trim() || "";
    const phoneNumber = document.getElementById("signupPhone")?.value.trim() || "";
    const address = document.getElementById("signupAddress")?.value.trim() || "";

    // 1) Validate BEFORE hitting Firebase Auth (your rules)
    try {
      validateSignupData({
        fullName,
        email,
        password,
        gender,
        identificationNumber,
        phoneNumber,
        address
      });
    } catch (err) {
      alert(err.message);
      return;
    }

    // 2) Create user in Firebase Authentication
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        try {
          // 3) Register in Firestore (DB) using use-case
          await registerUserInDatabase(user, {
            fullName,
            gender,
            identificationNumber,
            phoneNumber,
            address,
            password
          });

          alert("Account created successfully!");
          window.location.href = "login.html";
        } catch (err) {
          console.error("Error saving user profile:", err);
          alert(err.message || "Account created, but failed to save profile.");
        }
      })
      .catch((error) => {
        console.error("Signup error:", error);
        alert(error.message);
      });
  });
}

// LOGIN HANDLER (used on login.html)
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert("Login successful!");
        window.location.href = "index.html"; // change to main page
      })
      .catch((error) => {
        console.error("Login error:", error);
        alert(error.message);
      });
  });
}
