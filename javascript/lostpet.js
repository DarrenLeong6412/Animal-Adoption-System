// js/lostpet.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ===== FIREBASE CONFIG =====
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
const auth = getAuth(app);
const db = getFirestore(app);

// ===== GLOBAL VARIABLES =====
let allLostPets = [];
let currentUser = null;
let base64Image = "";

// ===== DOM ELEMENTS =====
const grid = document.getElementById("lostpetGrid");
const countText = document.getElementById("countText");
const searchInput = document.getElementById("searchInput");
const createBtn = document.getElementById("createLostPetBtn");
const modal = document.getElementById("lostPetFormModal");
const closeModalBtn = document.getElementById("closeLostPetModal");
const addLostPetForm = document.getElementById("addLostPetForm");
const fileInput = document.getElementById("fileInput");
const previewImg = document.getElementById("previewImg");

// ===== ANIMAL TYPE OTHER FIELD TOGGLE =====
const animalTypeSelect = document.getElementById("animalType");
const animalTypeOtherInput = document.getElementById("animalTypeOther");

if (animalTypeSelect && animalTypeOtherInput) {
  animalTypeSelect.addEventListener("change", function() {
    if (this.value === "Other") {
      animalTypeOtherInput.style.display = "block";
      animalTypeOtherInput.required = true;
    } else {
      animalTypeOtherInput.style.display = "none";
      animalTypeOtherInput.required = false;
      animalTypeOtherInput.value = "";
    }
  });
}

// =================== AUTH STATE ===================
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log("Auth state changed:", user ? user.email : "Not logged in");
});

// =================== FETCH LOST PETS ===================
async function fetchLostPets() {
  grid.innerHTML = "<p style='text-align:center; color:#666; padding:40px;'>Loading lost pet reports...</p>";

  try {
    const q = query(collection(db, "lostPets"), orderBy("date_Reported", "desc"));
    const snapshot = await getDocs(q);

    allLostPets = snapshot.docs.map(doc => ({
      lostpet_id: doc.id,
      ...doc.data()
    }));

    console.log("Fetched lost pets:", allLostPets.length);
    renderLostPets(allLostPets);
  } catch (err) {
    console.error("Error fetching lost pets:", err);
    grid.innerHTML = "<p style='color:red; text-align:center; padding:40px;'>Error loading lost pets. Please try again.</p>";
  }
}

// =================== RENDER LOST PETS ===================
function renderLostPets(list) {
  grid.innerHTML = "";
  
  if (list.length === 0) {
    grid.innerHTML = "<p style='text-align:center; color:#666; padding:40px;'>No lost pet reports found.</p>";
    countText.innerText = "Showing 0 reports";
    return;
  }

  list.forEach(pet => {
    const cardHTML = `
      <div class="lostpet-card">
        <div class="lostpet-card-img-container">
          <img src="${pet.photo || 'images/default-pet.jpg'}" alt="${pet.name}" class="lostpet-card-img">
          <div class="lostpet-card-status">
            <p class="${pet.status === 'Lost' ? '' : 'status-pending'}">${pet.status || 'Lost'}</p>
          </div>
        </div>
        <div class="lostpet-card-info-section">
          <div class="lostpet-card-info">
            <p class="lostpet-card-animal-name">${pet.name}</p>
            <p>${pet.animal_type} • ${pet.breed || "Unknown"} • ${pet.gender}</p>
            <p><strong>Last seen:</strong> ${pet.last_seen_Location}</p>
            <p><strong>Date:</strong> ${pet.last_seen_Date}</p>
          </div>
        </div>
      </div>
    `;
    grid.innerHTML += cardHTML;
  });

  countText.innerText = `Showing ${list.length} report${list.length !== 1 ? "s" : ""}`;
}

// =================== LIVE SEARCH ===================
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const queryText = searchInput.value.toLowerCase();
    const filtered = allLostPets.filter(pet =>
      [pet.name, pet.animal_type, pet.breed, pet.gender, pet.last_seen_Location]
        .some(field => field?.toLowerCase().includes(queryText))
    );

    renderLostPets(filtered);
  });
}

// =================== CREATE LOST PET MODAL ===================
if (createBtn) {
  createBtn.addEventListener("click", () => {
    console.log("Create button clicked, user:", currentUser);
    
    if (!currentUser) {
      alert("Please login first to create a lost pet report.");
      window.location.href = "login.html";
      return;
    }
    
    modal.classList.add("open");
  });
}

// Close modal
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("open");
    addLostPetForm.reset();
    previewImg.style.display = "none";
    base64Image = "";
    
    // Reset animal type other field
    if (animalTypeOtherInput) {
      animalTypeOtherInput.style.display = "none";
      animalTypeOtherInput.required = false;
    }
  });
}

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("open");
    addLostPetForm.reset();
    previewImg.style.display = "none";
    base64Image = "";
  }
});

// =================== IMAGE UPLOAD ===================
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPG, PNG).");
      fileInput.value = "";
      return;
    }

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2MB.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      previewImg.src = event.target.result;
      previewImg.style.display = "block";
      base64Image = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// =================== SUBMIT LOST PET REPORT ===================
if (addLostPetForm) {
  addLostPetForm.addEventListener("submit", async (e) => {
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
    
    // Handle "Other" animal type
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

    // Validation
    if (!name || !animal_type || !gender || !description || !last_seen_Location || !last_seen_Date) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!base64Image) {
      alert("Please upload a photo of the pet.");
      return;
    }

    // Disable submit button to prevent double submission
    const submitBtn = document.getElementById("submitLostPetBtn");
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
        status: "Lost",
        verified_By: null,
        date_Reported: serverTimestamp()
      });

      alert("Lost pet report submitted successfully!");
      modal.classList.remove("open");
      addLostPetForm.reset();
      previewImg.style.display = "none";
      base64Image = "";
      
      // Reset animal type other field
      if (animalTypeOtherInput) {
        animalTypeOtherInput.style.display = "none";
        animalTypeOtherInput.required = false;
      }

      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";

      // Refresh the list
      fetchLostPets();
    } catch (err) {
      console.error("Error submitting report:", err);
      alert("Failed to submit report. Please try again.");
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
    }
  });
}

// =================== INITIAL LOAD ===================
fetchLostPets();