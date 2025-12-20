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
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
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

// Protect against Analytics crash when local
try {
  getAnalytics(app);
} catch (e) {
  console.log("Analytics not available here:", e);
}

const auth = getAuth(app);
const db = getFirestore(app);

// for debugging
window.auth = auth;
window.db = db;

// ============== SIMPLE VALIDATION HELPERS (REUSE EVERYWHERE) ==============
function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email = "") {
  const e = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(e);
}

function normalizePhone(phone = "") {
  return String(phone).trim();
}

function isValidPhone(phone = "") {
  const cleaned = normalizePhone(phone);

  // allow only digits
  const allowedChars = /^[0-9]+$/;
  if (!allowedChars.test(cleaned)) return false;

  // must have 7-15 digits (ignore +, -, spaces)
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;

  

  return true;
}

function normalizeIC(ic = "") {
  return String(ic).trim().replace(/\s+/g, "");
}

/*ic validation*/
function isValidIC(ic = "") {
  const raw = normalizeIC(ic);

  // must be either 12 digits or dashed format
  const ic12 = /^\d{12}$/;
  const icDashed = /^\d{6}-\d{2}-\d{4}$/;

  if (!ic12.test(raw) && !icDashed.test(raw)) return false;

  // convert to 12 digits for date check
  const digits = raw.replace(/-/g, "");

  const yy = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);

  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  // Basic day-per-month check (including leap year for Feb)
  const isLeap = (yy % 4 === 0); 
  const daysInMonth = [31, (isLeap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dd > daysInMonth[mm - 1]) return false;

  return true;
}

// ============== "REPOSITORY" LAYER ==============
async function saveUserProfileToFirestore(firebaseUser, formData = {}) {
  const {
    fullName = "",
    gender = null,
    identificationNumber = null,
    phoneNumber = null,
    address = null
  } = formData;

  const userRef = doc(db, "users", firebaseUser.uid);

  const userData = {
    username: fullName || "",
    email: firebaseUser.email,
    password: null, // NOT storing plain password
    gender: gender || null,
    identification_Number: identificationNumber ? normalizeIC(identificationNumber) : null,
    role: "User",
    phone_Number: phoneNumber ? normalizePhone(phoneNumber) : null,
    address: address || null,

    createdAt: new Date().toISOString(),
    authProvider: "password",
    firebaseUid: firebaseUser.uid
  };

  await setDoc(userRef, userData, { merge: true });
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

  // Full name
  if (!fullName || fullName.trim().length === 0) errors.push("Full Name is required.");
  else if (fullName.length > 50) errors.push("Full Name must not exceed 50 characters.");

  // Email
  if (!email || String(email).trim().length === 0) errors.push("Email is required.");
  else if (String(email).length > 100) errors.push("Email must not exceed 100 characters.");
  else if (!isValidEmail(email)) errors.push("Email format is invalid.");

  // Password
  if (!password || password.length === 0) errors.push("Password is required.");
  else if (password.length < 6) errors.push("Password must be at least 6 characters.");
  else if (password.length > 255) errors.push("Password must not exceed 255 characters.");

  // Gender
  if (gender && !["M", "F", "O"].includes(gender)) errors.push("Gender must be Male, Female, or Other.");

  // IC
  if (identificationNumber) {
    if (!isValidIC(identificationNumber)) {
      errors.push("Identification Number (IC) is invalid. Example: 010203-04-1234 or 010203041234.");
    }
  }

  // Phone (REQUIRED)
  if (!phoneNumber || String(phoneNumber).trim().length === 0) {
    errors.push("Phone Number is required.");
  } else if (!isValidPhone(phoneNumber)) {
    errors.push("Phone Number is invalid. Use 7–15 digits only.");
  }

  // Address
  if (address && address.length > 255) errors.push("Address must not exceed 255 characters.");

  if (errors.length > 0) throw new Error(errors.join("\n"));
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
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = normalizeEmail(document.getElementById("signupEmail").value);
    const password = document.getElementById("signupPassword").value;
    const fullName = document.getElementById("signupName").value.trim();
    const phoneNumber = document.getElementById("signupPhone").value.trim();

    

    try {
      
      validateSignupData({ fullName, email, phoneNumber, password /*, identificationNumber */ });
    } catch (err) {
      alert(err.message);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await registerUserInDatabase(user, {
        fullName,
        password,
        phoneNumber
        
      });

      alert("Account created successfully!");
      window.location.href = "login.html";
    } catch (error) {
      console.error("Signup error:", error);
      alert(error.message);
    }
  });
}

// LOGIN HANDLER
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = normalizeEmail(document.getElementById("loginEmail").value);
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

// FORGOT PASSWORD HANDLER
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = normalizeEmail(document.getElementById("loginEmail")?.value);
    if (!email) {
      alert("Please enter your email first, then click 'Forgot password?'.");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox (and spam).");
    } catch (error) {
      console.error("Reset password error:", error);
      alert(error.message);
    }
  });
}

// ============== AUTH STATE LISTENER ==============
async function getUserRole(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return "User";
  return snap.data().role || "User";
}

onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed. Current user:", user?.uid || "null");

  // ===== Profile page elements =====
  const profileEmailEl = document.getElementById("profileEmail");
  const profileNameEl = document.getElementById("profileName");
  const profileGenderEl = document.getElementById("profileGender");
  const profilePhoneEl = document.getElementById("profilePhone");
  const profileAddressEl = document.getElementById("profileAddress");
  const profileIdentificationEl = document.getElementById("profileIdentification");

  const onProfilePage = !!(
    profileEmailEl ||
    profileNameEl ||
    profileGenderEl ||
    profilePhoneEl ||
    profileAddressEl ||
    profileIdentificationEl
  );

  // Profile edit controls
  const editBtn = document.getElementById("editProfileBtn");
  const saveBtn = document.getElementById("saveProfileBtn");
  const cancelBtn = document.getElementById("cancelProfileBtn");

  const editGenderEl = document.getElementById("editGender");
  const editPhoneEl = document.getElementById("editPhone");
  const editAddressEl = document.getElementById("editAddress");
  const editIdentificationEl = document.getElementById("editIdentification");

  let originalProfile = null;

  const showDash = (v) =>
    (v === null || v === undefined || String(v).trim() === "" ? "-" : v);

  function setEditMode(isEdit) {
    const displayEls = [profileGenderEl, profilePhoneEl, profileAddressEl, profileIdentificationEl];
    const editEls = [editGenderEl, editPhoneEl, editAddressEl, editIdentificationEl];

    displayEls.forEach(el => el && (el.style.display = isEdit ? "none" : ""));
    editEls.forEach(el => el && (el.style.display = isEdit ? "" : "none"));

    if (editBtn) editBtn.style.display = isEdit ? "none" : "";
    if (saveBtn) saveBtn.style.display = isEdit ? "" : "none";
    if (cancelBtn) cancelBtn.style.display = isEdit ? "" : "none";
  }

  // If on profile page but not logged in
  if (onProfilePage && !user) {
    alert("You must be logged in to view your profile.");
    window.location.href = "login.html";
    return;
  }

  // Load profile data
  if (onProfilePage && user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();

        // Save original snapshot for Cancel
        originalProfile = {
          gender: data.gender ?? "",
          phone_Number: data.phone_Number ?? "",
          address: data.address ?? "",
          identification_Number: data.identification_Number ?? ""
        };

        profileEmailEl && (profileEmailEl.textContent = data.email || "");
        profileNameEl && (profileNameEl.textContent = data.username || "");

        profileGenderEl && (profileGenderEl.textContent = showDash(data.gender));
        profilePhoneEl && (profilePhoneEl.textContent = showDash(data.phone_Number));
        profileAddressEl && (profileAddressEl.textContent = showDash(data.address));
        profileIdentificationEl && (profileIdentificationEl.textContent = showDash(data.identification_Number));

        editGenderEl && (editGenderEl.value = data.gender ?? "");
        editPhoneEl && (editPhoneEl.value = data.phone_Number ?? "");
        editAddressEl && (editAddressEl.value = data.address ?? "");
        editIdentificationEl && (editIdentificationEl.value = data.identification_Number ?? "");

        setEditMode(false);
      } else {
        console.warn("No profile doc found for user.uid:", user.uid);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }

    // Edit
    if (editBtn) editBtn.onclick = () => setEditMode(true);

    // Cancel
    if (cancelBtn) cancelBtn.onclick = () => {
      if (originalProfile) {
        editGenderEl && (editGenderEl.value = originalProfile.gender);
        editPhoneEl && (editPhoneEl.value = originalProfile.phone_Number);
        editAddressEl && (editAddressEl.value = originalProfile.address);
        editIdentificationEl && (editIdentificationEl.value = originalProfile.identification_Number);

        profileGenderEl && (profileGenderEl.textContent = showDash(originalProfile.gender));
        profilePhoneEl && (profilePhoneEl.textContent = showDash(originalProfile.phone_Number));
        profileAddressEl && (profileAddressEl.textContent = showDash(originalProfile.address));
        profileIdentificationEl && (
          profileIdentificationEl.textContent = showDash(originalProfile.identification_Number)
        );
      }
      setEditMode(false);
    };

    // Save
    if (saveBtn) saveBtn.onclick = async () => {
      try {
        const newGender = editGenderEl?.value ?? "";
        const newPhone = editPhoneEl?.value?.trim() ?? "";
        const newAddress = editAddressEl?.value?.trim() ?? "";
        const newIdentification = editIdentificationEl?.value?.trim() ?? "";

        // ===== VALIDATION =====
        if (!newPhone || newPhone.trim().length === 0) {
          alert("Phone Number is required.");
          return;
        }
        if (!isValidPhone(newPhone)) {
          alert("Phone Number is invalid. Use 7–15 digits only.");
          return;
        }

        // IC - validate only if user filled it
        if (newIdentification && !isValidIC(newIdentification)) {
          alert("Identification Number (IC) is invalid. Example: 010203-04-1234 or 010203041234.");
          return;
        }

        if (newAddress && newAddress.length > 255) {
          alert("Address must not exceed 255 characters.");
          return;
        }

        const payload = {
          gender: newGender === "" ? null : newGender,
          phone_Number: normalizePhone(newPhone),
          address: newAddress === "" ? null : newAddress,
          identification_Number: newIdentification === "" ? null : normalizeIC(newIdentification)
        };

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, payload);

        // update original snapshot
        originalProfile = {
          gender: payload.gender ?? "",
          phone_Number: payload.phone_Number ?? "",
          address: payload.address ?? "",
          identification_Number: payload.identification_Number ?? ""
        };

        profileGenderEl && (profileGenderEl.textContent = showDash(payload.gender));
        profilePhoneEl && (profilePhoneEl.textContent = showDash(payload.phone_Number));
        profileAddressEl && (profileAddressEl.textContent = showDash(payload.address));
        profileIdentificationEl && (profileIdentificationEl.textContent = showDash(payload.identification_Number));

        setEditMode(false);
        alert("Profile updated!");
      } catch (err) {
        console.error("Save profile error:", err);
        alert("Failed to update profile.");
      }
    };
  }

  // ===== NAVBAR AUTH UI =====
  const authBtnDesktop = document.getElementById("authBtnDesktop");
  const authBtnSidebar = document.getElementById("authBtnSidebar");

  const logoutIconDesktop = document.getElementById("logoutIconDesktop");
  const logoutIconSidebar = document.getElementById("logoutIconSidebar");
  const profileIconDesktop = document.getElementById("profileIconDesktop");
  const profileIconSidebar = document.getElementById("profileIconSidebar");

  const adminEls = document.querySelectorAll(".admin-only");

  const doLogout = async (e) => {
    e.preventDefault();
    await signOut(auth);
    alert("Logged out successfully.");
    window.location.href = "index.html";
  };

  if (user) {
    authBtnDesktop && (authBtnDesktop.style.display = "none");
    authBtnSidebar && (authBtnSidebar.style.display = "none");

    logoutIconDesktop && (logoutIconDesktop.style.display = "");
    logoutIconSidebar && (logoutIconSidebar.style.display = "");

    logoutIconDesktop && (logoutIconDesktop.onclick = doLogout);
    logoutIconSidebar && (logoutIconSidebar.onclick = doLogout);

    profileIconDesktop && (profileIconDesktop.style.display = "");
    profileIconSidebar && (profileIconSidebar.style.display = "");

    const role = await getUserRole(user.uid);

    adminEls.forEach(el => {
      el.style.display = role === "Admin" ? "" : "none";
    });

    if (role !== "Admin") {
      document.querySelectorAll('#navbar > ul:not(#sidebar) > li.admin-only').forEach(el => el.remove());
    }
  } else {
    authBtnDesktop && (authBtnDesktop.style.display = "");
    authBtnSidebar && (authBtnSidebar.style.display = "");

    logoutIconDesktop && (logoutIconDesktop.style.display = "none");
    logoutIconSidebar && (logoutIconSidebar.style.display = "none");

    profileIconDesktop && (profileIconDesktop.style.display = "none");
    profileIconSidebar && (profileIconSidebar.style.display = "none");

    adminEls.forEach(el => el.style.display = "none");
  }

  document.documentElement.classList.remove("auth-loading");
});

// Password visibility toggle
document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("toggle-password")) return;

  const inputId = e.target.getAttribute("data-target");
  const input = document.getElementById(inputId);

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    e.target.textContent = "🐵";
  } else {
    input.type = "password";
    e.target.textContent = "🙈";
  }
});
