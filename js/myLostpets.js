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

let currentUser = null;
let myLostPets = [];

/* =========================
   AUTH CHECK
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadMyLostPets(user.uid);
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

            const dateA = a.last_seen_Date ? new Date(a.last_seen_Date).getTime() : 0;
            const dateB = b.last_seen_Date ? new Date(b.last_seen_Date).getTime() : 0;
            return dateB - dateA;
        });

        // Render Grid
        myLostPets.forEach(pet => {
            let badgeClass = "badge-pending";
            let statusText = pet.verification_status || "Pending";

            if (statusText === "Approved") badgeClass = "badge-approved";
            else if (statusText === "Rejected") badgeClass = "badge-rejected";

            const dateStr = pet.last_seen_Date 
                ? new Date(pet.last_seen_Date).toLocaleDateString("en-GB")
                : "Date Unknown";

            const cardHTML = `
                <div onclick="openMyLostPetModal('${pet.id}')" class="lostpet-item-card">
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
        grid.innerHTML = '<p style="color:red; text-align:center;">Error loading your lost pets.</p>';
    }
}


/* =========================
   OPEN MODAL (EDIT / VIEW)
========================= */
window.openMyLostPetModal = function (id) {
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
};

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
window.saveMyLostPetChanges = async function () {
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
};

/* =========================
   CLOSE MODAL
========================= */
window.closeMyLostPetModal = function () {
  const modal = document.getElementById("myLostPet-modal");
  if (modal) {
    modal.classList.remove("open");
    console.log("❌ Modal closed");
  }
};