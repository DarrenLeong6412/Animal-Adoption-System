//console.log("requests.js connected");
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
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

const container = document.querySelector(".request-flex-container");
const filterButtons = document.querySelectorAll('input[name="request-filter-button"]');

let isLoading = true;
renderRequests([]);

onAuthStateChanged(auth, async (user) => {
  if (user) {

    await loadRequests(user.uid); // only load requests for this user
  }
  else {
    console.log("No user logged in");
    alert("You must be logged in to view your adoption requests.");
    window.location.href = "login.html";
    return;
  }
});

let requests = []; //create request empty array for current user requests
let allRequests = []; //empty array for all requests
//console.log("firebase configs passed");

// use async function to wait for the data to be retrieved first, then come back to finish processing and get the result
async function loadRequests(currentUserID) {
  // 1. Fetch all requests
  const requestSnap = await getDocs(collection(db, "requests"));

  if (requestSnap.empty) {
    console.log("no requests found");
    requests = [];
    userRequests = [];
    isLoading = false;
    renderRequests([]);
    return;
  }

  // 2. Read raw request data
  // converts the docsnap data into ui friendly format
  // without this have to do req.data().attribute everytime
  let rawRequests = requestSnap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  // EXTRA STEP: filter request to only the ones belonging to the current user
  //rawRequests = rawRequests.filter(r => r.user_ID === currentUserID);

  // 3. Collect unique animal listing IDs
  // creates an array of animal listings needed to fetch
  // using set ensures no duplicate listing ID
  const listingIds = [...new Set(
    rawRequests
      .map(r => r.listing_ID)
      .filter(Boolean) // safety: remove undefined/null
  )];

  // 4. Fetch related animals
  const animalMap = {};
  await Promise.all(
    listingIds.map(async (animalId) => {
      const animalSnap = await getDoc(doc(db, "animals", animalId));
      if (animalSnap.exists()) {
        animalMap[animalId] = animalSnap.data();
      }
    })
  );

  // 5. Merge request + animal (IMPORTANT: no const here)
  allRequests = rawRequests.map(r => {
    const animal = animalMap[r.listing_ID] || {};

    // Date formatting
    let formattedDate;
    if (r.dateApplied && r.dateApplied.toDate) {
      const dateObj = r.dateApplied.toDate();
      formattedDate = dateObj.toLocaleDateString("en-GB", {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } else {
      formattedDate = "Date Unknown";
    }

    return {
      id: r.id,                              // request document ID
      user_ID: r.user_ID,
      name: animal.name ?? "Unknown",
      type: animal.type ?? "—",
      breed: animal.breed ?? "—",
      imageUrl: animal.imageUrl ?? "images/no-image.png",
      location: animal.location ?? "—",
      dateApplied: formattedDate,
      status: r.status ?? "unknown",
      reason: r.reason ?? "—"
    };
  });

  requests = allRequests.filter(r => r.user_ID === currentUserID);
  // 6. Render once, after data is ready
  isLoading = false;
  renderRequests(requests);
}

window.openModal = openModal;
window.closeModal = closeModal;

// ---------- RENDER CARDS ----------
function renderRequests(list) {
  container.innerHTML = "";

  if (isLoading) {
    container.innerHTML += `
      <div class="request-content">
        <p>Loading requests...</p>
      </div>
    `;
    return;
  }

  if (list.length === 0) {
    container.innerHTML += `
      <div class="request-content">
        <p>No animals match your filters</p>
      </div>
    `;
    return;
  }

  list.forEach(req => {
    // Add the status class dynamically
    const statusClass = `status-${req.status.toLowerCase().replace(/\s/g, '-')}`;
    container.innerHTML += `
    <a class="request-card-view-details" data-id="${req.id}" cursor:pointer;">
    <div class="listing-card">
    
    <div class="listing-card-img-container">
      <img
        src="${req.imageUrl}"
        alt="${req.name}"
        class="listing-card-img"
      />

      <div class="listing-card-status">
        <p class="${statusClass}">
          ${capitalizeStatus(req.status)}
        </p>
      </div>
    </div>

    <div class="listing-card-info-section">

      <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
        <p class="listing-card-animal-name" style="margin:0;">
          ${req.name}
        </p>
        <span style="font-size:11px; color:#888; font-weight:500;">
          ${req.dateApplied}
        </span>
      </div>

      <p>${req.breed}</p>

      <div class="listing-card-details-row">
        <i class="fas fa-map-marker-alt"></i>
        <span>${req.location}</span>
      </div>
      
    </div>

  </div>
  </a>
`;

    console.log("Displayed card for request_ID: " + req.id);
  });

  container.querySelectorAll(".request-card-view-details").forEach(el => {
    el.addEventListener("click", () => openModal(el.dataset.id));
  });
}

// ---------- OPEN MODAL ----------
function openModal(id) {
  const modal = document.getElementById("modal");
  modal.classList.add("open");
  showModalContent(id); // populate content
  console.log("open modal for requestID: " + id);
}

// ---------- CLOSE MODAL ----------
function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("open");
  //console.log("closeModal");
}

// ---------- MODAL CONTENT ----------
function showModalContent(id) {

  // Convert req.id to string to match dataset
  id = String(id);

  const req = requests.find(r => String(r.id) === id);
  if (!req) {
    console.warn("Request not found for id:", id);
    return;
  }

  const modal = document.getElementById("modal");
  const modalTitle = modal.querySelector(".modal-inner-top-title h1");
  const modalImage = modal.querySelector(".modal-inner-image-container img");
  const modalInfoContainer = modal.querySelector(".modal-inner-info-container");

  modalTitle.innerText = req.name;
  modalImage.src = req.imageUrl;
  modalImage.alt = req.name;

  modalInfoContainer.innerHTML = `
    <div class="modal-inner-info-text">
        <h2 id="modalName">${req.name}</h2>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
        <i class="fas fa-paw"></i>
        <p class="modal-inner-info-text-title">Type</p>
        <span>${req.type} • ${req.breed}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
        <i class="fas fa-map-marker-alt"></i>
        <p class="modal-inner-info-text-title">Location</p>
        <span>${req.location}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
        <i class="fas fa-calendar-alt"></i>
        <p class="modal-inner-info-text-title">Date Applied</p>
        <span>${req.dateApplied}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
        <i class="fas fa-info-circle"></i>
        <p class="modal-inner-info-text-title">Status</p>
        <span>${capitalizeStatus(req.status)}</span>
    </div>

    <div class="modal-inner-info-text modal-detail-item">
        <i class="fas fa-question-circle"></i>
        <p class="modal-inner-info-text-title">Why do you want to adopt ${req.name}?</p>
    </div>
    <p class="modal-inner-info-text-data">${req.reason}</p>
`;

}

// ---------- HELPER ----------
function capitalizeStatus(status) {
  return status
    .split(" ")
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
const searchInput = document.getElementById("searchInput"); // make sure your HTML has this

// ---------- LIVE SEARCH ----------
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();

  const filtered = requests.filter(req =>
    [req.name, req.type, req.breed, req.location, req.reason].some(
      field => field.toLowerCase().includes(q)
    )
  );

  renderRequests(filtered);
});

// ---------- FILTER ----------
filterButtons.forEach(btn => {
  btn.addEventListener("change", () => {
    let value = document.querySelector('input[name="request-filter-button"]:checked').id;
    value[0].toUpperCase;
    if (value === "all") {
      console.log("Show all adoption requests");
      renderRequests(requests);
    } else {
      console.log("Filter for " + value);
      renderRequests(requests.filter(r => r.status === value));
    }
  });
});

document.querySelectorAll(".request-card-status p").forEach(p => {
  const status = p.innerText.toLowerCase().replace(/\s/g, "-"); // e.g., 'under review' → 'under-review'
  p.classList.add(`status-${status}`);
});