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
  setDoc,
  getDoc
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
//userID generate function removed

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
    
    username: fullName || "",
    email: firebaseUser.email,
    password: null,                            // NOT storing plain password
    gender: gender || null,
    identification_Number: identificationNumber || null,
    role: "User",
    phone_Number: phoneNumber || null,
    address: address || null,

    createdAt: new Date().toISOString(),
    authProvider: "password",
    firebaseUid: firebaseUser.uid
  };

  await setDoc(userRef, userData);
}

// ============== "USE CASE" LAYER ==============
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

  if (!fullName || fullName.trim().length === 0) {
    errors.push("Full Name is required.");
  } else if (fullName.length > 50) {
    errors.push("Full Name must not exceed 50 characters.");
  }

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

  if (!password || password.length === 0) {
    errors.push("Password is required.");
  } else if (password.length > 255) {
    errors.push("Password must not exceed 255 characters.");
  }

  if (gender && !["M", "F", "O"].includes(gender)) {
    errors.push("Gender must be M, F, or O.");
  }

  if (identificationNumber) {
    if (identificationNumber.length > 20) {
      errors.push("Identification Number must not exceed 20 characters.");
    }
    const idRegex = /^[A-Za-z0-9\-]+$/;
    if (!idRegex.test(identificationNumber)) {
      errors.push("Identification Number can only contain letters, numbers, and dashes.");
    }
  }

  if (phoneNumber) {
    if (phoneNumber.length > 15) {
      errors.push("Phone Number must not exceed 15 characters.");
    }
    const phoneRegex = /^[0-9+\-\s]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      errors.push("Phone Number can only contain digits, spaces, '+', and '-'.");
    }
  }

  if (address && address.length > 255) {
    errors.push("Address must not exceed 255 characters.");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

async function registerUserInDatabase(firebaseUser, formData) {
  validateSignupData({
    fullName: formData.fullName,
    email: firebaseUser.email,
    password: formData.password,
    gender: formData.gender,
    identificationNumber: formData.identificationNumber,
    phoneNumber: formData.phoneNumber,
    address: formData.address
  });

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

    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        try {
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
        
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Login error:", error);
        alert(error.message);
      });
  });
}

// LOGOUT HANDLER (used on profile.html)
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully.");
      window.location.href = "login.html";
    } catch (err) {
      console.error("Logout error:", err);
      alert("Failed to log out.");
    }
  });
}

// ============== AUTH STATE LISTENER (SESSION) ==============
// This will run on every page that includes auth.js
onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed. Current user:", user?.uid || "null");

  // Elements only exist on profile.html
  const profileEmailEl = document.getElementById("profileEmail");
  const profileNameEl  = document.getElementById("profileName");
  const profileIdEl    = document.getElementById("profileUserId");
  const profileGenderEl= document.getElementById("profileGender");
  const profilePhoneEl = document.getElementById("profilePhone");
  const profileAddressEl = document.getElementById("profileAddress");

  const onProfilePage =
    profileEmailEl ||
    profileNameEl ||
    profileIdEl ||
    profileGenderEl ||
    profilePhoneEl ||
    profileAddressEl;

  // If we're on profile.html and user is NOT logged in → kick to login
  if (onProfilePage && !user) {
    alert("You must be logged in to view your profile.");
    window.location.href = "login.html";
    return;
  }

  // If user is logged in & we're on profile page → load data from Firestore
  if (onProfilePage && user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();

        if (profileEmailEl)   profileEmailEl.textContent = data.email || "";
        if (profileNameEl)    profileNameEl.textContent = data.username || "";
        if (profileIdEl)      profileIdEl.textContent   = data.user_ID || "";
        if (profileGenderEl)  profileGenderEl.textContent = data.gender || "";
        if (profilePhoneEl)   profilePhoneEl.textContent  = data.phone_Number || "";
        if (profileAddressEl) profileAddressEl.textContent = data.address || "";
      } else {
        console.warn("No profile data found for this user.");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }


  const authBtnDesktop = document.getElementById("authBtnDesktop");
  const authBtnSidebar = document.getElementById("authBtnSidebar");

  const logoutIconDesktop = document.getElementById("logoutIconDesktop");
  const logoutIconSidebar = document.getElementById("logoutIconSidebar");
  const profileIconDesktop = document.getElementById("profileIconDesktop");
  const profileIconSidebar = document.getElementById("profileIconSidebar");

  const doLogout = async (e) => {
    e.preventDefault();
    await signOut(auth);
    alert("Logged out successfully.");
    window.location.href = "index.html";
  };

  if (user) {
    // logged in -> hide login/signup, show logout icon
    if (authBtnDesktop) authBtnDesktop.style.display = "none";
    if (authBtnSidebar) authBtnSidebar.style.display = "none";

    if (logoutIconDesktop) {
      logoutIconDesktop.style.display = "";
      logoutIconDesktop.onclick = doLogout;
    }
    if (logoutIconSidebar) {
      logoutIconSidebar.style.display = "";
      logoutIconSidebar.onclick = doLogout;
    }

    if (profileIconDesktop) {
      profileIconDesktop.style.display = "";
    }
    if (profileIconSidebar) {
      profileIconSidebar.style.display = "";
    }



  } else {
    // logged out -> show login/signup, hide logout icon
    if (authBtnDesktop) authBtnDesktop.style.display = "";
    if (authBtnSidebar) authBtnSidebar.style.display = "";

    if (logoutIconDesktop) logoutIconDesktop.style.display = "none";
    if (logoutIconSidebar) logoutIconSidebar.style.display = "none";

    if (profileIconDesktop) profileIconDesktop.style.display = "none";
    if (profileIconSidebar) profileIconSidebar.style.display = "none";
  }
  document.documentElement.classList.remove("auth-loading");

});
