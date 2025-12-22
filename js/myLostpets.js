import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ==================== FIREBASE CONFIG ====================
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

let myLostPets = [];

// ==================== AUTH STATE ====================
onAuthStateChanged(auth, (user) => {
  const grid = document.getElementById("myLostpetsGrid");
  if (user) {
    loadMyLostPets(user.uid);
  } else {
    if (grid) grid.innerHTML = '<p class="my-lostpets-loading">Please log in to view lost pets.</p>';
  }
});

// ==================== LOAD USER LOST PETS ====================
async function loadMyLostPets(uid) {
  const grid = document.getElementById("myLostpetsGrid");
  if (!grid) return;

  try {
    const q = query(collection(db, "lostPets"), where("user_id", "==", uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      grid.innerHTML = '<p class="my-lostpets-loading">No reports submitted yet.</p>';
      return;
    }

    grid.innerHTML = "";
    myLostPets = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      data.id = docSnap.id;
      myLostPets.push(data);
    });

    // Sort: Pending first, then by date_Reported descending
    myLostPets.sort((a, b) => {
      const priority = (pet) => {
        if (pet.status === "Found") return 1;
        if (pet.verification_status === "Approved") return 2;
        if (pet.verification_status === "Pending") return 3;
        if (pet.verification_status === "Rejected") return 4;
        return 5; // fallback
      };  
  return priority(a) - priority(b);

      // Compare by last_seen_Date string (YYYY-MM-DD)
      const timeA = a.last_seen_Date ? new Date(a.last_seen_Date).getTime() : 0;
      const timeB = b.last_seen_Date ? new Date(b.last_seen_Date).getTime() : 0;
      return timeB - timeA;
    });

    // Render grid
    myLostPets.forEach(pet => {
      let badgeClass = "";
let statusText = "";

// 1️⃣ Found first
if (pet.status === "Found") {
  statusText = "Found";
  badgeClass = "badge-found";
}

// 2️⃣ Approved (not found)
else if (pet.verification_status === "Approved") {
  statusText = "Approved";
  badgeClass = "badge-approved";
}

// 3️⃣ Pending
else if (pet.verification_status === "Pending") {
  statusText = "Pending";
  badgeClass = "badge-pending";
}

// 4️⃣ Rejected
else if (pet.verification_status === "Rejected") {
  statusText = "Rejected";
  badgeClass = "badge-rejected";
}

// fallback
else {
  statusText = "Pending";
  badgeClass = "badge-pending";
}
      const formattedDate = pet.date_Reported
  ? pet.date_Reported.toDate().toISOString().split("T")[0]
  : "Unknown";

      const cardHTML = `
        <div onclick="window.openMyLostPetModal('${pet.id}')" class="lostpet-item-card">
          <div class="lostpet-item-img-container">
            <img src="${pet.photo || 'images/no-image.png'}" class="lostpet-item-img">
          </div>
          <div class="lostpet-item-content">
            <h3 class="lostpet-item-title">${pet.name}</h3>
            <p class="lostpet-item-meta">${pet.animal_type || "Unknown"} • ${formattedDate}</p>
          </div>
          <div class="lostpet-item-badge-container">
            <span class="lostpet-item-badge ${badgeClass}">
              ${statusText}
            </span>
          </div>
        </div>
      `;
      grid.innerHTML += cardHTML;
    });

  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p style="color:red; text-align:center;">Error loading your lost pet.</p>';
  }
}

// ==================== OPEN MODAL ====================
window.openMyLostPetModal = function (id) {
  const data = myLostPets.find(item => item.id === id);
  if (!data) return;

  const modal = document.getElementById("userLostPet-modal");
  modal.dataset.currentPetId = data.id;
  document.getElementById("modalImg").src = data.photo || 'images/no-image.png';
  const container = document.querySelector("#userLostPet-modal .modal-inner-info-container");

  const standardTypes = ['Dog', 'Cat', 'Rabbit'];
  const getOption = (val, current) => `<option value="${val}" ${current === val ? 'selected' : ''}>${val}</option>`;

  // ---------------------- PENDING / EDIT MODE ----------------------
  if (data.verification_status === "Pending") {
    document.getElementById("modalEditTitle").innerText = "Edit LostPet";

    let otherTypeValue = "";
    let selectedType = data.animal_type;
    if (!standardTypes.includes(data.animal_type)) {
      selectedType = "Other";
      otherTypeValue = data.animal_type;
    }

    container.innerHTML = `
      <div class="edit-form-group">
        <label class="edit-form-label">Animal Name<span class="required">*</span></label>
        <input type="text" id="editName" class="edit-form-input" required value="${data.name}">
      </div>

      <div class="edit-form-group form-group-half">
        <label class="edit-form-label">Type <span class="required">*</span></label>
        <select id="editType" class="edit-form-input">
          ${getOption('Dog', selectedType)}
          ${getOption('Cat', selectedType)}
          ${getOption('Rabbit', selectedType)}
          ${getOption('Other', selectedType)}
        </select>
      </div>

      <div class="edit-form-group" id="otherAnimalTypeGroup" style="display:${selectedType === 'Other' ? 'block' : 'none'};">
        <label class="edit-form-label">Specify Animal Type <span class="required">*</span></label>
        <input type="text" id="animalTypeOther" class="edit-form-input" placeholder="e.g., Hamster" value="${otherTypeValue}">
      </div>

      <div class="edit-form-group form-group-half">
        <label class="edit-form-label">Breed<span class="required">*</span></label>
        <input type="text" id="editBreed" class="edit-form-input" required value="${data.breed}">
      </div>

      <div class="edit-form-group form-group-half">
        <label class="edit-form-label">Age (Months) <span class="required">*</span></label>
        <input type="number" id="editAge" class="edit-form-input" required value="${data.age}" min="0">
      </div>

      <div class="edit-form-group form-group-half">
        <label class="edit-form-label">Gender<span class="required">*</span></label>
        <select id="editGender" class="edit-form-input">
          ${getOption('Male', data.gender)}
          ${getOption('Female', data.gender)}
        </select>
      </div>

      <div class="edit-form-group">
        <label class="edit-form-label">Last Seen Location<span class="required">*</span></label>
        <input type="text" id="editLastSeenLocation" class="edit-form-input" required value="${data.last_seen_Location}">
      </div>

      <div class="edit-form-group">
        <label class="edit-form-label">Last Seen Date<span class="required">*</span></label>
        <input type="date" id="editLastSeenDate" name="lastSeenDate" required value="${data.last_seen_Date || ''}">
      </div>

      <div class="edit-form-group">
        <label class="edit-form-label">Description<span class="required">*</span></label>
        <textarea id="editDescription" class="edit-form-textarea" required>${data.description}</textarea>
      </div>

      <div class="edit-form-group">
        <label class="edit-form-label">Current Status</label>
        <div class="edit-status-text status-text-pending">Pending</div>
      </div>

      <button id="btnSaveChanges" class="btn-save-changes" onclick="saveLostPetChanges()">Save Changes</button>
    `;

    // "Other" type toggle
    container.addEventListener("change", (e) => {
      if (e.target.id === "editType") {
        const otherGroup = document.getElementById("otherAnimalTypeGroup");
        const otherInput = document.getElementById("animalTypeOther");
        if (e.target.value === "Other") {
          otherGroup.style.display = "block";
          otherInput.required = true;
        } else {
          otherGroup.style.display = "none";
          otherInput.required = false;
          otherInput.value = "";
        }
      }
    });
  }

  // ---------------------- VIEW MODE ----------------------
  else {
    document.getElementById("modalEditTitle").innerText = "View Details";

    let statusColor = "#000";
    let statusBg = "#f0f0f0";

    if (data.status === "Found") {
    statusColor = "#0369a1";     
    statusBg = "#e0f2fe";        // light blue background   
} else if (data.verification_status === "Approved") {
    statusColor = "#16a34a";        // green text
    statusBg = "#d1fae5";           // light green background
} else if (data.verification_status === "Rejected") {
    statusColor = "#dc2626";        // red text
    statusBg = "#fee2e2";           // light red background
}

    // Build HTML for the modal content
    let statusHTML = "";

    if (data.verification_status === "Approved" && data.status === "Lost") {
      statusHTML = `<button id="markFoundBtn" class="lostpet-mark-found-btn">
    Mark as Found
</button>`;

      // 2. Add CSS (either in your <style> or dynamically)
      const style = document.createElement('style');
      style.innerHTML = `
.lostpet-mark-found-btn {
    width: 95%;
    background-color: #164A41;
    color: white;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 10px;
    font-size: 14px;
    transition: 0.2s;
}

.lostpet-mark-found-btn:hover {
    background-color: #d0e0d3;
}
`;
      document.head.appendChild(style);
    } else {
      // Pending or Rejected → show colored block

      let displayStatus = "";
if (data.verification_status === "Rejected") {
  displayStatus = "Rejected";
} else if (data.status) {
  displayStatus = data.status;
} else if (data.verification_status) {
  displayStatus = data.verification_status;
} else {
  displayStatus = "Pending";
}

statusHTML = `<div style="margin-top: 25px; padding: 12px; background-color: ${statusBg}; color: ${statusColor}; border-radius: 8px; text-align: center; font-weight: bold; border: 1px solid ${statusColor};">
                ${displayStatus}
              </div>`;
    }

    container.innerHTML = `
      <h2 style="color: #164A41; margin-bottom: 15px;">${data.name}</h2>
      <div class="modal-detail-item">
        <i class="fas fa-paw"></i>
        <div><p class="modal-inner-info-text-title">Type & Breed</p><span>${data.animal_type} • ${data.breed}</span></div>
      </div>
      <div class="modal-detail-item">
        <i class="fas fa-birthday-cake"></i>
        <div><p class="modal-inner-info-text-title">Age & Gender</p><span>${data.age} months old • ${data.gender}</span></div>
      </div>
      <div class="modal-detail-item">
        <i class="fas fa-map-marker-alt"></i>
        <div><p class="modal-inner-info-text-title">Last Seen Location</p><span>${data.last_seen_Location}</span></div>
      </div>
      <div class="modal-detail-item">
        <i class="fas fa-solid fa-calendar"></i>
        <div><p class="modal-inner-info-text-title">Last Seen Date</p><span>${data.last_seen_Date}</span></div>
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

      ${statusHTML}
      <p style="text-align: center; font-size: 12px; color: #888; margin-top: 5px;">*You cannot edit this listing because it has been processed.</p>
    `;

    // ---------------------- MARK AS FOUND BUTTON ----------------------
    const markFoundBtn = document.getElementById("markFoundBtn");
    if (markFoundBtn) {
      markFoundBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to mark this pet as found?")) return;
        try {
          const docRef = doc(db, "lostPets", data.id);
          await updateDoc(docRef, {
            status: "Found" // <- match the field your UI uses
          });
          
          alert(`${data.name} has been marked as Found!`);
          modal.classList.remove("open");

          if (auth.currentUser) {
            loadMyLostPets(auth.currentUser.uid); // reload user's lost pets
          }

        } catch (err) {
          console.error(err);
          alert("Failed to mark as found. Please try again.");
        }
      });
    }
  }

  modal.classList.add("open");
};


// ==================== CLOSE MODAL ====================
window.closeLostPetModal = function () {
  document.getElementById("userLostPet-modal").classList.remove("open");
};

// ==================== SAVE CHANGES ====================
window.saveLostPetChanges = async function () {
  const modal = document.getElementById("userLostPet-modal");
  const id = modal.dataset.currentPetId;

  if (!id) {
    alert("Error: No pet ID found.");
    return;
  }

  const btn = document.getElementById("btnSaveChanges");
  btn.innerText = "Saving...";
  btn.disabled = true;

  try {
    const docRef = doc(db, "lostPets", id);
    const currentDoc = await getDoc(docRef);

    if (!currentDoc.exists()) {
      alert("Lost pet report not found.");
      return;
    }

    const currentData = currentDoc.data();

    if (currentData.verification_status !== "Pending") {
      alert("This lost pet report is no longer Pending and cannot be edited.");
      closeLostPetModal();
      loadMyLostPets(auth.currentUser.uid);
      return;
    }

    // Gather form data
    const name = modal.querySelector("#editName")?.value.trim();
    let animalType = modal.querySelector("#editType")?.value;
    let otherTypeInput = modal.querySelector("#animalTypeOther");
    if (animalType === "Other") {
      animalType = otherTypeInput?.value.trim();
    }
    const breed = modal.querySelector("#editBreed")?.value.trim();
    const ageInput = modal.querySelector("#editAge")?.value;
    const age = ageInput ? parseInt(ageInput) : null;
    const gender = modal.querySelector("#editGender")?.value;
    const lastSeenLocation = modal.querySelector("#editLastSeenLocation")?.value.trim();
    const lastSeenDate = modal.querySelector("#editLastSeenDate")?.value;
    const description = modal.querySelector("#editDescription")?.value.trim();

    // ================= VALIDATION =================
    if (!name) {
  alert("Animal name cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

if (!animalType) {
  alert("Animal type cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

if (!breed) {
  alert("Breed cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

// Age validation: must not be blank or negative
if (age === null || isNaN(age)) {
  alert("Age cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}
if (age < 0) {
  alert("Age cannot be negative.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

if (!gender) {
  alert("Gender cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

if (!lastSeenLocation) {
  alert("Last seen location cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

if (!lastSeenDate) {
  alert("Last seen date cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

if (!description) {
  alert("Description cannot be blank.");
  btn.innerText = "Save Changes";
  btn.disabled = false;
  return;
}

    // ================= UPDATE DOC =================
    await updateDoc(docRef, {
      name,
      animal_type: animalType,
      breed,
      age,
      gender,
      last_seen_Location: lastSeenLocation,
      last_seen_Date: lastSeenDate,
      description
    });

    alert("Lost Pet Report updated successfully!");
    closeLostPetModal();
    if (auth.currentUser) loadMyLostPets(auth.currentUser.uid);

  } catch (error) {
    console.error("Update failed:", error);
    alert("Failed to update lost pet: " + error.message);
  } finally {
    btn.innerText = "Save Changes";
    btn.disabled = false;
  }
};

