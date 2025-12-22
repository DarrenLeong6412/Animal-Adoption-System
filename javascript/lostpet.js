// javascript/lostpet.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
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
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let isAdmin = false;
let allLostPets = [];

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    await checkAdminStatus(user.uid);
  }
  loadLostPets();
});

async function getUserById(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

async function checkAdminStatus(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const role = (userData.role || "").toLowerCase();
      if (role === "admin") {
        isAdmin = true;
      }
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
  }
}

async function loadLostPets() {
  const grid = document.getElementById("lostpet-grid");
  grid.innerHTML = '<p style="text-align:center; width:100%;">Loading Lost Pets...</p>';

  try {
    const q = query(collection(db, "lostPets"), orderBy("date_Reported", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      grid.innerHTML = '<p>No Lost petsright now.</p>';
      return;
    }

    allLostPets = [];
    querySnapshot.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;

      if (data.date_Reported && data.date_Reported.seconds) {
        const dateObj = new Date(data.date_Reported.seconds * 1000);
        data.formattedDate = dateObj.toLocaleDateString("en-GB", {
          day: 'numeric', month: 'short', year: 'numeric'
        });
      } else {
        data.formattedDate = "Date Unknown";
      }

      allLostPets.push(data);
    });

    filterAndRender();
    setupFilters();

  } catch (error) {
    console.error("Error:", error);
    grid.innerHTML = '<p style="color:red;">Error loading data.</p>';
  }
}

function renderGrid(dataList) {
  const grid = document.getElementById("lostpet-grid");
  grid.innerHTML = "";

  // Only show pets that are approved and still lost
  const publicList = dataList.filter(lostPet => 
      lostPet.verification_status === "Approved" && lostPet.status === "Lost"
  );

  if (publicList.length === 0) {
    grid.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No Lost Pets found matching your criteria.</p>';
    return;
  }

  publicList.forEach((lostPet) => {
    let badgeStyle = "background-color: #ed2525ff; color: white;";
    let statusText = "Lost";
    const breedDisplay = lostPet.breed ? `${lostPet.type} • ${lostPet.breed}` : lostPet.type;

    let adminMenu = "";
    if (isAdmin) {
      adminMenu = `
        <div class="card-menu">
  <div class="menu-icon" onclick="toggleMenu('${lostPet.id}'); event.stopPropagation();">
    <i class="fas fa-ellipsis-v"></i>
  </div>
  <div id="menu-${lostPet.id}" class="menu-dropdown">
    <div onclick="event.stopPropagation(); window.editLostPet('${lostPet.id}')">
      <i class="fas fa-edit"></i> Edit
    </div>
    <div onclick="event.stopPropagation(); deleteLostPet('${lostPet.id}')" style="color: #dc2626;">
      <i class="fas fa-trash"></i> Delete
    </div>
  </div>
</div>
      `;
    }

    const cardHTML = `
      <div class="lostpet-card" onclick="openModalById('${lostPet.id}')" style="position: relative;">
        <div class="lostpet-card-img-container">
          ${adminMenu}
          <img src="${lostPet.photo}" alt="${lostPet.name}" class="lostpet-card-img">
          <div class="lostpet-card-status">
            <p style="${badgeStyle}">${statusText}</p>
          </div>
        </div>
        <div class="lostpet-card-info-section">
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
            <p class="lostpet-card-animal-name" style="margin:0;">
              ${lostPet.name}
            </p>
            <span style="font-size:11px; color:#888; font-weight:500;">
              ${lostPet.formattedDate || "Date Unknown"}
            </span>
          </div>
          <p>
            ${lostPet.animal_type}
            ${lostPet.breed ? " • " + lostPet.breed : ""}
            ${lostPet.age ? " • " + lostPet.age + " Months" : ""}
            ${lostPet.gender ? " • " + lostPet.gender : ""}
          </p>
          <div class="lostpet-card-details-row">
            <i class="fas fa-map-marker-alt"></i>
            <span>${lostPet.last_seen_Location}</span>
          </div>
        </div>
      </div>
    `;
    grid.innerHTML += cardHTML;
  });
}


window.toggleMenu = function (id) {
  document.querySelectorAll('.menu-dropdown').forEach(el => {
    if (el.id !== `menu-${id}`) el.style.display = 'none';
  });
  const menu = document.getElementById(`menu-${id}`);
  if (menu) {
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
  }
};


window.addEventListener('click', (e) => {
  // Close admin menu
  if (!e.target.closest('.card-menu')) {
    document.querySelectorAll('.menu-dropdown').forEach(el => el.style.display = 'none');
  }

  // Close Modal on outside click
  const modal = document.getElementById("lostPetModal");
  if (e.target == modal) {
    window.closePetModal();
  }
});

// Modal Close Function (need change in html and maybe css)
window.closePetModal = function () {
  document.getElementById("lostPetDetailModal").classList.remove("open");
};

window.deleteLostPet = async function (id) {
  if (!confirm("Are you sure you want to delete this lost pet report?")) return;
  try {
    await deleteDoc(doc(db, "lostPets", id));
    alert("Lost pet report deleted successfully.");
    loadLostPets();
  } catch (error) {
    console.error("Error deleting:", error);
    alert("Failed to delete lost pet report.");
  }
};

window.openModalById = async function (id) {
  // Find the pet data from your global array
  const data = allLostPets.find(l => l.id === id);
  if (!data) return;

  const owner = data.user_id
    ? await getUserById(data.user_id)
    : null;

  // Get modal elements by ID
  const modalMainTitle = document.getElementById('modalMainTitle');
  const modalPetImg = document.getElementById('modalPetImg');
  const modalPetInfo = document.getElementById('modalPetInfo');
  const lostPetModal = document.getElementById('lostPetDetailModal');

  // Safety check
  if (!modalMainTitle || !modalPetImg || !modalPetInfo || !lostPetModal) {
    console.error("Modal elements not found in DOM");
    return;
  }

  // Set modal title
  modalMainTitle.innerText = `${data.name}'s Details`;

  // Set image with fallback if null or empty
  modalPetImg.src = data.photo && data.photo.trim() !== '' ? data.photo : 'images/no-image.png';

  // Set modal content
  modalPetInfo.innerHTML = `
    <h2 id="modalName">${data.name}</h2>

    <div class="modal-detail-item">
      <i class="fas fa-paw"></i>
      <div>
        <p class="modal-inner-info-text-title">Type & Breed</p>
        <span>${data.animal_type}${data.breed ? " • " + data.breed : ""}</span>
      </div>
    </div>

    <div class="modal-detail-item">
      <i class="fas fa-birthday-cake"></i>
      <div>
        <p class="modal-inner-info-text-title">Age & Gender</p>
        <span>
          ${data.age ? data.age + " months" : "Not specified"}
          ${data.gender ? " • " + data.gender : ""}
        </span>
      </div>
    </div>

    <div class="modal-detail-item">
      <i class="fas fa-map-marker-alt"></i>
      <div>
        <p class="modal-inner-info-text-title">Last Seen Location</p>
        <span>${data.last_seen_Location || "Unknown"}</span>
      </div>
    </div>

    <div class="modal-detail-item">
      <i class="<fas fa-solid fa-calendar"></i>
      <div>
        <p class="modal-inner-info-text-title">Last Seen Date</p>
        <span>${data.last_seen_Date || "Unknown"}</span>
      </div>
    </div>

    <div class="modal-detail-item">
      <i class="<fas fas fa-address-card"></i>
      <div>
        <p class="modal-inner-info-text-title">Owner Name</p>
        <span>${owner?.username || "Unknown"}</span>
      </div>
    </div>

    <div class="modal-detail-item">
      <i class="<fas fas fa-address-book"></i>
      <div>
        <p class="modal-inner-info-text-title">Owner Phone Number</p>
        <span>${owner?.phone_Number || "Unknown"}</span>
      </div>
    </div>

    <h3 style="color:#0d3b25; font-size:18px; font-weight:700; margin-top:25px; margin-bottom:8px;">
      Description
    </h3>

    <p style="
        color:#555;
        line-height:1.6;
        font-size:14px;
        margin-top:0;
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
    ">
  ${data.description || 'No description provided.'}
</p>
  `;

  // Open modal
  lostPetModal.classList.add("open");
};

// Replace your editLostPet function with this corrected version:

window.editLostPet = function (id) {
  const data = allLostPets.find(pet => pet.id === id);
  if (!data) return;

  // Use correct IDs from your HTML for edit modal
  const modalTitle = document.querySelector('#editLostPetDetailModal .modal-inner-top-title h1');
  const modalImg = document.querySelector('#editLostPetDetailModal .modalImg');
  const container = document.querySelector('#editLostPetDetailModal .modal-inner-info-container');
  const editModal = document.getElementById('editLostPetDetailModal');

  if (!modalTitle || !modalImg || !container || !editModal) {
    console.error("Edit modal elements not found");
    return;
  }

  // Set modal title and image
  modalTitle.innerText = "Admin: Edit Lost Pet";
  modalImg.src = data.photo || 'images/no-image.png';

  const createOption = (value, current) => `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`;

  // Populate modal content
  container.innerHTML = `
    <input type="hidden" id="editDocId" value="${data.id}">

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Name</label>
      <input id="editName" value="${data.name}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Animal Type</label>
      <input id="editType" value="${data.animal_type}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Breed</label>
      <input id="editBreed" value="${data.breed || ""}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Status (Pet)</label>
      <select id="editStatus" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        ${createOption("Lost", data.status)}
        ${createOption("Found", data.status)}
      </select>
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Verification Status</label>
      <select id="editVerification" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        ${createOption("Pending", data.verification_status)}
        ${createOption("Approved", data.verification_status)}
        ${createOption("Rejected", data.verification_status)}
      </select>
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Last Seen Location</label>
      <input id="editLocation" value="${data.last_seen_Location}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Description</label>
      <textarea id="editDescription" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;">${data.description || ""}</textarea>
    </div>

    <div class="modal-status-preview" style="margin: 15px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; font-weight: bold;">
      Current Status: <span id="statusPreview">${data.status}</span> • Verification: <span id="verificationPreview">${data.verification_status}</span>
    </div>

    <button id="saveChangesBtn" style="width: 100%; padding: 12px; background: #0d3b25; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Save Changes</button>
  `;

  // Update status preview dynamically when selects change
  const statusSelect = container.querySelector('#editStatus');
  const verificationSelect = container.querySelector('#editVerification');

  statusSelect.addEventListener('change', e => {
    container.querySelector('#statusPreview').innerText = e.target.value;
  });

  verificationSelect.addEventListener('change', e => {
    container.querySelector('#verificationPreview').innerText = e.target.value;
  });

  // Attach save handler
  document.getElementById("saveChangesBtn").onclick = handleAdminSave;

  // Open the correct modal
  editModal.classList.add("open");
};

// Add a function to close the edit modal
window.closeEditModal = function () {
  document.getElementById("editLostPetDetailModal").classList.remove("open");
};

// Update your existing closePetModal to handle both modals
window.closePetModal = function () {
  document.getElementById("lostPetDetailModal").classList.remove("open");
  document.getElementById("editLostPetDetailModal").classList.remove("open");
};



// 3. HANDLE SAVE (need to change also for admin to change the details one )
async function handleAdminSave() {
  const id = document.getElementById("editDocId").value;
  const btn = document.getElementById("saveChangesBtn");

  btn.disabled = true;
  btn.innerText = "Saving...";

  try {
    const verification = document.getElementById("editVerification").value;
    let status = document.getElementById("editStatus").value;

    // Only set status to "Lost" if approved
    if (verification === "Approved") {
      status = "Lost";
    } else if (verification === "Rejected") {
      status = ""; // or leave undefined
    }

    await updateDoc(doc(db, "lostPets", id), {
      name: document.getElementById("editName").value,
      animal_type: document.getElementById("editType").value,
      breed: document.getElementById("editBreed").value,
      status: status,
      verification_status: verification,
      last_seen_Location: document.getElementById("editLocation").value,
      description: document.getElementById("editDescription").value
    });

    alert("Updated successfully");
    document.getElementById("animalModal").classList.remove("open");
    loadLostPets();

  } catch (e) {
    console.error(e);
    alert("Update failed");
  } finally {
    btn.disabled = false;
    btn.innerText = "Save Changes";
  }
}

//(need look for the search input)
function setupFilters() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", filterAndRender);
  }
}

function filterAndRender() {
  const searchInput = document.getElementById("searchInput");
  const searchText = searchInput?.value.toLowerCase() || "";

  const filteredData = allLostPets.filter(pet => {
    return (
      (pet.name || "").toLowerCase().includes(searchText) ||
      (pet.animal_type || "").toLowerCase().includes(searchText) ||
      (pet.breed || "").toLowerCase().includes(searchText) ||
      (pet.last_seen_Location || "").toLowerCase().includes(searchText)
    );
  });

  renderGrid(filteredData);
}