// javascript/lostpet.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
  getFirestore, collection, getDocs, query, where, orderBy, doc, updateDoc
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

let allLostPets = [];
let currentUser = null;

const grid = document.getElementById("lostpetGrid");
const countText = document.getElementById("countText");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("lostPetDetailModal");
const closeModalBtn = document.getElementById("closeDetailModal");

const createLostPetBtn = document.getElementById("createLostPetBtn");

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateCreateButtonBehavior();
});

function updateCreateButtonBehavior() {
  if (createLostPetBtn) {
    createLostPetBtn.parentElement.onclick = (e) => {
      e.preventDefault();

      if (!currentUser) {
        alert("You must be logged in to create a lost pet report.");
        window.location.href = "login.html";
        return;
      }

      window.location.href = "createLostPet.html";
    };
  }
}

// Fetch only APPROVED lost pets
async function fetchLostPets() {
  grid.innerHTML = "<p style='text-align:center; color:#666; padding:40px;'>Loading lost pet reports...</p>";

  try {
    const q = query(
      collection(db, "lostPets")
    );

    const snapshot = await getDocs(q);

    // EMPTY STATE (not an error)
    if (snapshot.empty) {
      grid.innerHTML = `
        <p style="text-align:center; color:#666; padding:40px;">
          No lost pet reports available.
        </p>`;
      return;
    }

    allLostPets = snapshot.docs.map(doc => ({
      lostpet_id: doc.id,
      ...doc.data()
    }));

    console.log("Fetched approved lost pets:", allLostPets.length);
    renderLostPets(allLostPets);

  } catch (err) {
    console.error("Error fetching lost pets:", err);

    // ONLY real errors reach here
    grid.innerHTML = `
      <p style="color:red; text-align:center; padding:40px;">
        Error loading lost pet reports.
      </p>`;
  }
}

// Render cards
function renderLostPets(list) {
  grid.innerHTML = "";
  
  if (list.length === 0) {
    grid.innerHTML = "<p style='text-align:center; color:#666; padding:40px;'>No approved lost pet reports found.</p>";
    countText.innerText = "Showing 0 reports";
    return;
  }

  list.forEach(pet => {
    const statusClass = pet.status === "Found" ? "status-found" : "";
    
    const card = document.createElement("div");
    card.className = "lostpet-card";
    card.onclick = () => openModal(pet);
    
    card.innerHTML = `
      <div class="lostpet-card-img-container">
        <img src="${pet.photo || 'images/default-pet.jpg'}" alt="${pet.name}" class="lostpet-card-img">
        <div class="lostpet-card-status">
          <p class="${statusClass}">${pet.status || 'Lost'}</p>
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
    `;
    
    grid.appendChild(card);
  });

  countText.innerText = `Showing ${list.length} report${list.length !== 1 ? "s" : ""}`;
}

// Search functionality
searchInput.addEventListener("input", () => {
  const queryText = searchInput.value.toLowerCase();
  const filtered = allLostPets.filter(pet =>
    [pet.name, pet.animal_type, pet.breed, pet.gender, pet.last_seen_Location]
      .some(field => field?.toLowerCase().includes(queryText))
  );
  renderLostPets(filtered);
});

// Open detail modal
function openModal(pet) {
  document.getElementById("modalPetName").textContent = pet.name;
  document.getElementById("modalPetImg").src = pet.photo || 'images/default-pet.jpg';
  
  const infoContainer = document.getElementById("modalPetInfo");
  
  // Check if this is the owner's pet
  const isOwner = currentUser && currentUser.uid === pet.user_id;
  const canMarkFound = isOwner && pet.status === "Lost";
  
  infoContainer.innerHTML = `
    <div class="modal-inner-info-text">
      <h3>${pet.name}</h3>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
      <i class="fas fa-paw"></i>
      <p class="modal-inner-info-text-title">Type & Breed</p>
      <span>${pet.animal_type} • ${pet.breed || "Unknown"}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
      <i class="fas fa-venus-mars"></i>
      <p class="modal-inner-info-text-title">Gender</p>
      <span>${pet.gender === 'M' ? 'Male' : 'Female'}</span>
    </div>

    ${pet.age ? `
    <div class="modal-inner-info-text modal-detail-item">
      <i class="fas fa-birthday-cake"></i>
      <p class="modal-inner-info-text-title">Age</p>
      <span>${pet.age} months old</span>
    </div>
    ` : ''}

    <div class="modal-inner-info-text modal-detail-item">
      <i class="fas fa-map-marker-alt"></i>
      <p class="modal-inner-info-text-title">Last Seen Location</p>
      <span>${pet.last_seen_Location}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
      <i class="fas fa-calendar-alt"></i>
      <p class="modal-inner-info-text-title">Last Seen Date</p>
      <span>${pet.last_seen_Date}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
      <i class="fas fa-info-circle"></i>
      <p class="modal-inner-info-text-title">Status</p>
      <span>${pet.status}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item" style="margin-top: 15px;">
      <i class="fas fa-align-left"></i>
      <p class="modal-inner-info-text-title">Description</p>
    </div>
    <div class="modal-inner-info-text modal-detail-item">
      <span style="line-height: 1.5; color: #555;">${pet.description}</span>
    </div>

    ${canMarkFound ? `
      <button onclick="markAsFound('${pet.lostpet_id}')" class="btn-save-changes" style="margin-top: 20px;">
        <i class="fas fa-check-circle"></i> Mark as Found
      </button>
    ` : ''}

    ${isOwner ? `
      <div class="modal-info-box" style="margin-top: 20px; padding: 15px; background-color: #f0f4f8; border-left: 4px solid #2196F3; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
          <strong>Note:</strong> You cannot edit the details of this report after submission. If you need to make changes, please contact us at <strong>support@pawresq.com</strong>
        </p>
      </div>
    ` : ''}
  `;

  modal.classList.add("open");
}

// Close modal
closeModalBtn.addEventListener("click", () => {
  modal.classList.remove("open");
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("open");
  }
});

// Mark as Found function
window.markAsFound = async function(petId) {
  const confirmMessage = `Are you sure you want to mark this pet as Found?\n\nThis action will update the status from 'Lost' to 'Found' and notify others in the community.`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    await updateDoc(doc(db, "lostPets", petId), {
      status: "Found"
    });

    alert("Pet marked as Found! Thank you for the update. The community has been notified.");
    modal.classList.remove("open");
    fetchLostPets();
  } catch (err) {
    console.error("Error marking as found:", err);
    alert("Failed to update status. Please try again.");
  }
};

// Initial load
fetchLostPets();