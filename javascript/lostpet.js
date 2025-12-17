// =====================================================
// lostpet.js
// Public viewing allowed | Login required to create report
// =====================================================


// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";


// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyCy5YAmmb1aTnWiXljQr3yOVsTKmYPAS08",
  authDomain: "pet-adoption-system-cf9f7.firebaseapp.com",
  projectId: "pet-adoption-system-cf9f7",
  storageBucket: "pet-adoption-system-cf9f7.firebasestorage.app",
  messagingSenderId: "615748560994",
  appId: "1:615748560994:web:465de9b90ac9208ec1493b",
  measurementId: "G-RZQDCB3V2C"
};


// ================= INITIALIZE FIREBASE =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ================= GLOBAL STATE =================
let currentUser = null;
let allLostPets = [];
let base64Image = "";


// ================= AUTH LISTENER (NO REDIRECT) =================
function initAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
  });
}


// ================= IMAGE HANDLER =================
function initImageUpload() {
  const fileInput = document.getElementById("fileInput");
  const previewImg = document.getElementById("previewImg");

  if (!fileInput) return;

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      previewImg.style.display = "block";
      compressImage(ev.target.result, 800, 0.7, (img) => {
        base64Image = img;
      });
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(base64, maxWidth, quality, callback) {
  const img = new Image();
  img.src = base64;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    callback(canvas.toDataURL("image/jpeg", quality));
  };
}


// ================= FETCH LOST PET REPORTS =================
async function fetchLostPets() {
  const grid = document.getElementById("lostpetGrid");
  grid.innerHTML = "<p style='text-align:center;'>Loading lost pet reports...</p>";

  try {
    const q = query(collection(db, "lostPets"), orderBy("date_Reported", "desc"));
    const snapshot = await getDocs(q);

    allLostPets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderLostPets(allLostPets);

  } catch (error) {
    console.error(error);
    grid.innerHTML = "<p style='color:red;'>Failed to load lost pet reports.</p>";
  }
}


// ================= RENDER LOST PET CARDS =================
function renderLostPets(list) {
  const grid = document.getElementById("lostpetGrid");
  grid.innerHTML = "";

  if (list.length === 0) {
    grid.innerHTML = "<p style='text-align:center;'>No lost pet reports found.</p>";
    return;
  }

  list.forEach(pet => {
    grid.innerHTML += `
      <div class="lostpet-card">
        <div class="lostpet-card-img-container">
          <img src="${pet.photo}" alt="${pet.name}" class="lostpet-card-img">
          <div class="lostpet-card-status status-${pet.status}">
            ${pet.status}
          </div>
        </div>

        <div class="lostpet-card-info-section">
          <p class="lostpet-card-animal-name">${pet.name}</p>
          <p>${pet.animal_type} • ${pet.breed || "Unknown"} • ${pet.gender}</p>
          <p><strong>Last Seen:</strong> ${pet.last_seen_Location}</p>
        </div>
      </div>
    `;
  });
}


// ================= SEARCH FILTER =================
function initSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const filtered = allLostPets.filter(pet =>
      [
        pet.name,
        pet.animal_type,
        pet.breed,
        pet.gender,
        pet.last_seen_Location
      ].some(field => field?.toLowerCase().includes(q))
    );
    renderLostPets(filtered);
  });
}


// ================= FORM VALIDATION =================
function validateLostPetForm(data) {
  if (!data.name || data.name.length < 2) return "Invalid pet name.";
  if (!data.animal_type) return "Animal type is required.";
  if (!data.gender) return "Gender is required.";
  if (!data.last_seen_Location || data.last_seen_Location.length < 3)
    return "Invalid last seen location.";
  if (!data.last_seen_Date) return "Last seen date is required.";
  if (!data.description || data.description.length < 10)
    return "Description must be at least 10 characters.";
  if (!base64Image) return "Pet photo is required.";
  return null;
}


// ================= CREATE LOST PET REPORT =================
async function createLostPetReport() {

  // 🔐 Login check ONLY here
  if (!currentUser) {
    alert("Please login to submit a lost pet report.");
    window.location.href = "login.html";
    return;
  }

  const petData = {
    name: document.getElementById("petName").value.trim(),
    animal_type: document.getElementById("animalType").value,
    breed: document.getElementById("petBreed").value.trim(),
    age: parseInt(document.getElementById("petAge").value) || null,
    gender: document.getElementById("petGender").value,
    description: document.getElementById("petDescription").value.trim(),
    last_seen_Location: document.getElementById("lastSeenLocation").value.trim(),
    last_seen_Date: document.getElementById("lastSeenDate").value,
    photo: base64Image
  };

  const error = validateLostPetForm(petData);
  if (error) {
    alert(error);
    return;
  }

  try {
    await addDoc(collection(db, "lostPets"), {
      ...petData,
      user_ID: currentUser.uid,
      status: "Lost",
      verified_By: null,
      date_Reported: serverTimestamp()
    });

    alert("Lost pet report submitted successfully.");
    window.location.href = "lostpet.html";

  } catch (error) {
    console.error(error);
    alert("Failed to submit report.");
  }
}

// ================= MODAL HANDLING =================
function initCreateLostPetButton() {
  const btn = document.getElementById("createLostPetBtn");
  const modal = document.getElementById("lostPetFormModal");
  const closeBtn = document.getElementById("closeLostPetModal");

  if (!btn || !modal || !closeBtn) return;

  // Open modal
  btn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please login to create a lost pet report.");
      window.location.href = "login.html";
      return;
    }
    modal.style.display = "block";
  });

  // Close modal
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    document.getElementById("addLostPetForm").reset();
    document.getElementById("previewImg").style.display = "none";
    base64Image = "";
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      document.getElementById("addLostPetForm").reset();
      document.getElementById("previewImg").style.display = "none";
      base64Image = "";
    }
  });
}

// ================= FORM SUBMIT =================
function initFormSubmit() {
  const form = document.getElementById("addLostPetForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    createLostPetReport();
  });
}

// ================= INIT ALL =================
initAuth();
initImageUpload();
initFormSubmit();
fetchLostPets();
initSearch();
initCreateLostPetButton();
