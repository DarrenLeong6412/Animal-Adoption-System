import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadMyLostPets(user.uid);
    } else {
        const grid = document.getElementById("myLostpetsGrid");
        if(grid) grid.innerHTML = '<p class="my-lostpets-loading">Please log in to view lost pets.</p>';
    }
});

/* =========================
   LOAD USER LOST PETS
========================= */
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

        // Sort: Pending first, then by lastSeenDate (latest first)
        myLostPets.sort((a, b) => {
            const statusOrder = { "Pending": 1, "Approved": 2, "Rejected": 3 };
            const statusA = statusOrder[a.verification_status] || 99;
            const statusB = statusOrder[b.verification_status] || 99;
            if (statusA !== statusB) return statusA - statusB;
            const timeA = a.date_Reported && a.date_Reported.seconds ? a.cdate_Reported.seconds : 0;
            const timeB = b.date_Reported && b.date_Reported.seconds ? b.date_Reported.seconds : 0;
            return timeB - timeA;
        });

        // Render Grid
        myLostPets.forEach(pet => {
            let badgeClass = "badge-pending";
            let statusText = pet.verification_status || "Pending";

            if (statusText === "Approved") badgeClass = "badge-approved";
            else if (statusText === "Rejected") badgeClass = "badge-rejected";

            const dateStr = pet.date_Reported 
                ? new Date(pet.date_Reported).toLocaleDateString("en-GB")
                : "Date Unknown";
            
            const cardHTML = `
              <div onclick="window.openMyLostPetModal('${pet.id}')" class="lostpet-item-card">
                    <div class="lostpet-item-img-container">
                        <img src="${pet.photo || 'images/no-image.png'}" class="lostpet-item-img">
                    </div>
                    <div class="lostpet-item-content">
                        <h3 class="lostpet-item-title">${pet.name}</h3>
                        <p class="lostpet-item-meta">${pet.animal_type || "Unknown"} • ${dateStr}</p>
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

// 3. Open Modal (Dynamic Logic)
window.openMyLostPetModal = function(id) {
    const data = myLostPets.find(item => item.id === id);
    if (!data) return;

    const modal = document.getElementById("userLostPetModal");
    
    // Set Header Image
    document.getElementById("modalEditImg").src = data.photo || 'images/no-image.png';
    
    const container = document.querySelector("#userLostPetModal .modal-inner-info-container");
    
    // ============================================================
    // SCENARIO 1: STATUS IS PENDING -> SHOW EDIT FORM
    // ============================================================
    if (data.status === "Pending") {
        document.getElementById("modalEditTitle").innerText = "Edit LostPet";
        
        const getOption = (val, current) => `<option value="${val}" ${current === val ? 'selected' : ''}>${val}</option>`;

        container.innerHTML = `
            <input type="hidden" id="editDocId" value="${data.id}">

            <div class="edit-form-group">
                <label class="edit-form-label">Animal Name</label>
                <input type="text" id="editName" class="edit-form-input" ${required} value="${data.name}">
            </div>

            <div class="form-row-split">
                <div class="edit-form-group form-group-half">
                    <label class="edit-form-label">Type</label>
                    <select id="editType" class="edit-form-input">
                        ${getOption('Dog', data.animal_type)}
                        ${getOption('Cat', data.animal_type)}
                        ${getOption('Rabbit', data.animal_type)}
                        ${getOption('Other', data.animal_type)}
                    </select>
                </div>
                <div class="edit-form-group form-group-half">
                    <label class="edit-form-label">Breed</label>
                    <input type="text" id="editBreed" class="edit-form-input" ${required} value="${data.breed}">
                </div>
            </div>

            <div class="form-row-split">
                <div class="edit-form-group form-group-half">
                    <label class="edit-form-label">Age (Months)</label>
                    <input type="number" id="editAge" class="edit-form-input" ${required} value="${data.age}">
                </div>
                <div class="edit-form-group form-group-half">
                    <label class="edit-form-label">Gender</label>
                    <select id="editGender" class="edit-form-input">
                        ${getOption('Male', data.gender)}
                        ${getOption('Female', data.gender)}
                    </select>
                </div>
            </div>

            <div class="edit-form-group">
                <label class="edit-form-label">Last Seen Location</label>
                <input type="text" id="editLocation" class="edit-form-input" ${required} value="${data.last_seen_Location}">
            </div>

            <div class="edit-form-group">
                    <label>Last Seen Date<span class="required">*</span></label>
                    <input type="date" id="lastSeenDate" name="lastSeenDate" ${required} value="${data.last_seen_Date}">
            </div>

            <div class="edit-form-group">
                <label class="edit-form-label">Description</label>
                <textarea id="editDescription" class="edit-form-textarea">${data.description}</textarea>
            </div>

            <div class="edit-form-group">
                <label class="edit-form-label">Current Status</label>
                <div class="edit-status-text status-text-pending">Pending</div>
            </div>

            <button id="btnSaveChanges" class="btn-save-changes" onclick="saveUserLostPet()">
                Save Changes
            </button>
        `;
    } 
    else {
        document.getElementById("modalEditTitle").innerText = "View Details";
        
        let statusColor = "#000";
        let statusBg = "#f0f0f0";
        let displayStatus = data.status;

        if(data.status === "Available") {
            statusColor = "#166534";
            statusBg = "#d1fae5";
            displayStatus = "Approved"; 
        } else if(data.status === "Rejected") {
            statusColor = "#dc2626";
            statusBg = "#fee2e2";
        } else if(data.status === "Adopted") {
            statusColor = "#0369a1";
            statusBg = "#e0f2fe";
        }

        container.innerHTML = `
            <h2 style="color: #164A41; margin-bottom: 15px;">${data.name}</h2>

            <div class="modal-detail-item">
                <i class="fas fa-paw"></i>
                <div>
                    <p class="modal-inner-info-text-title">Type</p>
                    <span>${data.type} • ${data.breed}</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="fas fa-birthday-cake"></i>
                <div>
                    <p class="modal-inner-info-text-title">Age</p>
                    <span>${data.age} months old • ${data.gender}</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <p class="modal-inner-info-text-title">Location</p>
                    <span>${data.location}</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="fas fa-syringe"></i>
                <div>
                    <p class="modal-inner-info-text-title">Vaccination</p>
                    <span>${data.vaccinationStatus || 'Not Specified'}</span>
                </div>
            </div>

            <h3 style="color: #0d3b25; font-size: 18px; font-weight: 700; margin-top: 25px; margin-bottom: 8px;">About ${data.name}</h3>
            
            <p style="color: #555; line-height: 1.6; font-size: 14px; margin-top: 0;">
                ${data.description || 'No description provided.'}
            </p>

            <div style="margin-top: 25px; padding: 12px; background-color: ${statusBg}; color: ${statusColor}; border-radius: 8px; text-align: center; font-weight: bold; border: 1px solid ${statusColor};">
                ${displayStatus}
            </div>

            
            <p style="text-align: center; font-size: 12px; color: #888; margin-top: 5px;">
                *You cannot edit this listing because it has been processed.
            </p>
        `;
    }

    modal.classList.add("open");
};

/* =========================
   OPEN MODAL (EDIT / VIEW)
========================= */
function openMyLostPetModal(id) {
  console.log("🔍 Opening modal for pet ID:", id);
  
  const pet = myLostPets.find(p => p.id === id);
  if (!pet) {
    console.error("❌ Pet not found:", id);
    alert("Pet not found!");
    return;
  }
  
  console.log("✅ Found pet:", pet);

  // Get modal element first to check if it exists
  const modal = document.getElementById("myLostPet-modal");
  if (!modal) {
    console.error("❌ Modal element not found!");
    alert("Modal element not found in HTML!");
    return;
  }

  // Populate fields
  try {
    document.getElementById("myLostPet-modalPetId").value = pet.id;
    document.getElementById("myLostPet-petName").value = pet.name || "";
    document.getElementById("myLostPet-animalType").value = pet.animal_type || "";
    document.getElementById("myLostPet-breed").value = pet.breed || "";
    document.getElementById("myLostPet-age").value = pet.age || "";
    document.getElementById("myLostPet-genderSelect").value = pet.gender || "";
    document.getElementById("myLostPet-lastSeenLocation").value = pet.last_seen_Location || "";
    document.getElementById("myLostPet-lastSeenDate").value = pet.last_seen_Date || "";
    document.getElementById("myLostPet-description").value = pet.description || "";
    document.getElementById("myLostPet-verificationStatus").value = pet.verification_status || "Pending";
    
    // Set photo
    const photoElement = document.getElementById("myLostPet-petPhoto");
    if (photoElement) {
      photoElement.src = pet.photo || 'images/no-image.png';
    }
    
    console.log("✅ All fields populated");
  } catch (error) {
    console.error("❌ Error populating fields:", error);
    alert("Error loading pet data: " + error.message);
    return;
  }

  // Check if editable
  const isEditable = pet.verification_status === "Pending";
  console.log("📝 Is editable:", isEditable, "Status:", pet.verification_status);

  toggleMyLostPetFormEditable(isEditable);

  // Update modal title
  document.getElementById("myLostPet-modalTitle").innerText =
    isEditable ? "Edit Lost Pet" : "View Lost Pet";

  // Show/hide save button
  const saveBtn = document.getElementById("myLostPet-saveBtn");
  saveBtn.style.display = isEditable ? "inline-block" : "none";

  // Open modal
  modal.classList.add("open");
  console.log("✅ Modal opened, classes:", modal.className);
  console.log("🎉 Modal should be visible now");
}

/* =========================
   TOGGLE FORM EDIT MODE
========================= */
function toggleMyLostPetFormEditable(editable) {
  const inputs = document.querySelectorAll(
    "#myLostPet-modal input:not(#myLostPet-modalPetId):not(#myLostPet-verificationStatus), " +
    "#myLostPet-modal textarea, " +
    "#myLostPet-modal select"
  );
  inputs.forEach(input => {
    input.disabled = !editable;
  });
  console.log(`🔒 Form fields ${editable ? 'enabled' : 'disabled'}`);
}

/* =========================
   SAVE UPDATE (PENDING ONLY)
========================= */
async function saveMyLostPetChanges() {
  const petId = document.getElementById("myLostPet-modalPetId").value;
  if (!petId) {
    alert("No pet ID found.");
    return;
  }

  console.log("💾 Saving changes for pet:", petId);

  try {
    const petRef = doc(db, "lostPets", petId);
    const snap = await getDoc(petRef);

    if (!snap.exists()) {
      alert("Lost Pet not found.");
      return;
    }

    if (snap.data().verification_status !== "Pending") {
      alert("This report has already been processed and cannot be edited.");
      closeMyLostPetModal();
      loadMyLostPets(currentUser.uid);
      return;
    }

    await updateDoc(petRef, {
      name: document.getElementById("myLostPet-petName").value,
      animal_type: document.getElementById("myLostPet-animalType").value,
      breed: document.getElementById("myLostPet-breed").value,
      age: parseInt(document.getElementById("myLostPet-age").value) || 0,
      gender: document.getElementById("myLostPet-genderSelect").value,
      last_seen_Location: document.getElementById("myLostPet-lastSeenLocation").value,
      last_seen_Date: document.getElementById("myLostPet-lastSeenDate").value,
      description: document.getElementById("myLostPet-description").value
    });

    console.log("✅ Report updated successfully");
    alert("Report updated successfully!");
    closeMyLostPetModal();
    loadMyLostPets(currentUser.uid);
  } catch (error) {
    console.error("❌ Error saving changes:", error);
    alert("Error saving changes: " + error.message);
  }
}

/* =========================
   CLOSE MODAL
========================= */
function closeMyLostPetModal() {
  const modal = document.getElementById("myLostPet-modal");
  if (modal) {
    modal.classList.remove("open");
    console.log("❌ Modal closed");
  }
}

/* =========================
   ATTACH BUTTON EVENT LISTENERS (on page load)
========================= */
document.addEventListener('DOMContentLoaded', function() {
  console.log("📄 DOM loaded, attaching button listeners");

  // Save button
  const saveBtn = document.getElementById("myLostPet-saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener('click', saveMyLostPetChanges);
    console.log("✅ Save button listener attached");
  }

  // Close button (X icon)
  const closeBtn = document.querySelector('#myLostPet-modal .modal-inner-top-exit a');
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeMyLostPetModal();
    });
    console.log("✅ Close button listener attached");
  }

  // Close on background click
  const modal = document.getElementById("myLostPet-modal");
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeMyLostPetModal();
      }
    });
    console.log("✅ Background click listener attached");
  }
});