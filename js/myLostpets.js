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
  const listContainer = document.getElementById("myLostpetsGrid");
  listContainer.innerHTML = "";

  const q = query(
    collection(db, "lostPets"),
    where("user_id", "==", uid)
  );

  const snapshot = await getDocs(q);
  myLostPets = [];

  snapshot.forEach(docSnap => {
    myLostPets.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  if (myLostPets.length === 0) {
    listContainer.innerHTML = "<p>No reports submitted yet.</p>";
    return;
  }

  myLostPets.forEach(pet => {
    listContainer.appendChild(createPetCard(pet));
  });
}

/* =========================
   CREATE PET CARD
========================= */
function createPetCard(pet) {
  const card = document.createElement("div");
  card.className = "my-lostpets-card";

  let badgeClass = "badge-pending";
  if (pet.verification_status === "Approved") badgeClass = "badge-approved";
  if (pet.verification_status === "Rejected") badgeClass = "badge-rejected";

  card.innerHTML = `
    <img src="${pet.photo || 'images/no-image.png'}" alt="Pet Image">

    <div class="my-lost-pets-card-content">
      <h3>${pet.name}</h3>

      <span class="status-badge ${badgeClass}">
        ${pet.verification_status || "Pending"}
      </span>

      <p><strong>Status:</strong> ${pet.status}</p>

      <div class="card-actions">
        <button onclick="openMyPetModal('${pet.id}')">
          ${pet.verification_status === "Pending" ? "Edit" : "View"}
        </button>
      </div>
    </div>
  `;

  return card;
}

/* =========================
   OPEN MODAL (EDIT / VIEW)
========================= */
window.openMyPetModal = function (id) {
  const pet = myLostPets.find(p => p.id === id);
  if (!pet) return;

  document.getElementById("modalPetId").value = pet.id;
  document.getElementById("petName").value = pet.name || "";
  document.getElementById("animalType").value = pet.animal_type || "";
  document.getElementById("breed").value = pet.breed || "";
  document.getElementById("age").value = pet.age || "";
  document.getElementById("gender").value = pet.gender || "";
  document.getElementById("lastSeenLocation").value = pet.last_seen_Location || "";
  document.getElementById("lastSeenDate").value = pet.last_seen_Date || "";
  document.getElementById("description").value = pet.description || "";

  const isEditable = pet.verification_status === "Pending";

  toggleFormEditable(isEditable);

  document.getElementById("modalTitle").innerText =
    isEditable ? "Edit Lost Pet" : "View Lost Pet";

  document.getElementById("saveBtn").style.display =
    isEditable ? "inline-block" : "none";

  document.getElementById("myPetModal").classList.add("open");
};

/* =========================
   TOGGLE FORM EDIT MODE
========================= */
function toggleFormEditable(editable) {
  const inputs = document.querySelectorAll("#myPetModal input, #myPetModal textarea, #myPetModal select");
  inputs.forEach(input => input.disabled = !editable);
}

/* =========================
   SAVE UPDATE (PENDING ONLY)
========================= */
window.saveMyPetChanges = async function () {
  const petId = document.getElementById("modalPetId").value;
  if (!petId) return;

  const petRef = doc(db, "lostPets", petId);
  const snap = await getDoc(petRef);

  if (!snap.exists()) {
    alert("Lost Pets not found.");
    return;
  }

  if (snap.data().verification_status !== "Pending") {
    alert("This report has already been processed.");
    closeMyPetModal();
    loadMyLostPets(currentUser.uid);
    return;
  }

  await updateDoc(petRef, {
    name: document.getElementById("petName").value,
    animal_type: document.getElementById("animalType").value,
    breed: document.getElementById("breed").value,
    age: document.getElementById("age").value,
    gender: document.getElementById("gender").value,
    last_seen_Location: document.getElementById("lastSeenLocation").value,
    last_seen_Date: document.getElementById("lastSeenDate").value,
    description: document.getElementById("description").value
  });

  alert("Report updated successfully.");
  closeMyPetModal();
  loadMyLostPets(currentUser.uid);
};

/* =========================
   CLOSE MODAL
========================= */
window.closeMyPetModal = function () {
  document.getElementById("myPetModal").classList.remove("open");
};
