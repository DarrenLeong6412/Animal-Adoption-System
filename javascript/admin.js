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
const categoryButtons = document.querySelectorAll('input[name="approval-category-button"]');

let isLoading = true;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadRequests(); // only load requests for this user
    }
    else {
        console.log("No user logged in");
        alert("You must be logged in to view your adoption requests.");
        window.location.href = "login.html";
        return;
    }
});

let unapprovedRequests = []; //create request empty array for current user requests
let allRequests = []; //empty array for all requests
//console.log("firebase configs passed");

// use async function to wait for the data to be retrieved first, then come back to finish processing and get the result
async function loadRequests() {
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

    // 3. Collect unique animal listing IDs
    // creates an array of animal listings needed to fetch
    // using set ensures no duplicate listing ID
    const listingIds = [...new Set(
        rawRequests
            .map(r => r.listing_ID)
            .filter(Boolean) // safety: remove undefined/null
    )];

    // 4. Collect unique user IDs
    const userIds = [...new Set(
        rawRequests
            .map(r => r.user_ID)
            .filter(Boolean) // safety: remove undefined/null
    )];
    // 5. Fetch related animals
    const animalMap = {};
    await Promise.all(
        listingIds.map(async (animalId) => {
            const animalSnap = await getDoc(doc(db, "animals", animalId));
            if (animalSnap.exists()) {
                animalMap[animalId] = animalSnap.data();
            }
        })
    );

    // 6. Fetch related users
    const userMap = {};
    await Promise.all(
        userIds.map(async (userId) => {
            const userSnap = await getDoc(doc(db, "users", userId));
            if (userSnap.exists()) {
                userMap[userId] = userSnap.data();
            }
        })
    );

    // 7. Merge request + animal (IMPORTANT: no const here)
    allRequests = rawRequests.map(r => {
        const animal = animalMap[r.listing_ID] || {};
        const user = userMap[r.user_ID] || {};

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
            id: r.id,

            // request info
            status: r.status ?? "unknown",
            reason: r.reason ?? "—",
            dateApplied: formattedDate,
            environmentDesc: r.environmentDesc ?? "—",
            environmentPhoto: r.environmentPhoto ?? "images/no-image.png",

            // animal info
            animalName: animal.name ?? "Unknown",
            type: animal.type ?? "—",
            breed: animal.breed ?? "—",
            imageUrl: animal.imageUrl ?? "images/no-image.png",
            location: animal.location ?? "—",

            // user info
            username: user.username ?? "—",
            identification_Number: user.identification_Number ?? "—",
            phone_Number: user.phone_Number ?? "—",
            email: user.email ?? "—"
        };
    });

    unapprovedRequests = allRequests.filter(r => r.status === "pending");
    // 6. Render once, after data is ready
    isLoading = false;
}

window.openModal = openModal;
window.closeModal = closeModal;

// ---------- RENDER CARDS ----------
function renderRequests(list) {
    console.log("renderRequests called")
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
        <p>No adoption requests at the moment.</p>
      </div>
    `;
        return;
    }

    list.forEach(req => {
        // Add the status class dynamically
        const statusClass = `status-${req.status.toLowerCase().replace(/\s/g, '-')}`;
        container.innerHTML += `
      <div class="request-card">
            <div class="request-card-img-container">
                <img class="request-card-img" src="${req.imageUrl}" alt="${req.animalName}">
            </div>

            <div class="request-card-info-section">
                <div class="request-card-info">
                    <p class="request-card-animal-name">${req.animalName}</p>

                    <p>Submitted By: ${req.username}</p>
                    <p>Phone No.: ${req.phone_Number}</p>
                    <p>Email: ${req.email}</p>
                    <p>Identification No.: ${req.identification_Number}</p>

                    <a>
                        <p class="request-card-view-details" data-id="${req.id}">
                            View Details
                        </p>
                    </a>
                </div>

                <div class="request-card-status">
                    <p class="${statusClass}">
                        ${capitalizeStatus(req.status)}
                    </p>
                </div>
            </div>
        </div>
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

    const req = unapprovedRequests.find(r => String(r.id) === id);
    if (!req) {
        console.warn("Request not found for id:", id);
        return;
    }

    const modal = document.getElementById("modal");
    const modalTitle = modal.querySelector(".modal-inner-top-title h1");
    const modalImage = modal.querySelector(".modal-inner-image-container img");
    const modalInfoContainer = modal.querySelector(".modal-inner-info-container");

    modalTitle.innerText = req.animalName;
    modalImage.src = req.imageUrl;
    modalImage.alt = req.name;

    modalInfoContainer.innerHTML = `
    <div class="modal-inner-top-title>
        <h1>${req.animalName}</h1>
    </div>

    <div class="modal-inner-info-text">
        <h2 id="modalName">${req.animalName}</h2>
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

  <!-- USER INFO -->
  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-user"></i>
    <p class="modal-inner-info-text-title">Submitted By</p>
    <span>${req.username}</span>
  </div>

  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-id-card"></i>
    <p class="modal-inner-info-text-title">Identification Number</p>
    <span>${req.identification_Number}</span>
  </div>

  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-phone"></i>
    <p class="modal-inner-info-text-title">Phone Number</p>
    <span>${req.phone_Number}</span>
  </div>

  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-envelope"></i>
    <p class="modal-inner-info-text-title">Email</p>
    <span>${req.email}</span>
  </div>

  <!-- STATUS -->
  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-info-circle"></i>
    <p class="modal-inner-info-text-title">Status</p>
    <span>${capitalizeStatus(req.status)}</span>
  </div>

  <!-- REASON -->
  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-question-circle"></i>
    <p class="modal-inner-info-text-title">
      Why do you want to adopt ${req.animalName}?
    </p>
  </div>
  <p class="modal-inner-info-text-data">${req.reason}</p>

  <!-- ENVIRONMENT DESCRIPTION -->
  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-home"></i>
    <p class="modal-inner-info-text-title">Home Environment Description</p>
  </div>
  <p class="modal-inner-info-text-data">${req.environmentDesc}</p>

  <!-- ENVIRONMENT PHOTO -->
  <div class="modal-inner-info-text modal-detail-item">
    <i class="fas fa-image"></i>
    <p class="modal-inner-info-text-title">Home Environment Photo</p>
  </div>
  <img 
    src="${req.environmentPhoto}" 
    alt="Home Environment"
    class="modal-environment-photo"
  />
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

// ---------- CATEGORY SELECTION ----------
categoryButtons.forEach(btn => {
    btn.addEventListener("change", () => {
        let value = document.querySelector('input[name="approval-category-button"]:checked').id;
        value[0].toUpperCase;
        if (value === "animalListings") {
            //function call here for renderListings
            return;
        } else if (value === "adoptionRequests") {
            console.log(value);
            renderRequests([]);
            renderRequests(unapprovedRequests);
        } else if (value === "lostPetReports") {
            //function call here for lostPetReports
            console.log(value);
            return;
        } else {
            console.log("no category selected")
        }
    });
});

document.querySelectorAll(".request-card-status p").forEach(p => {
    const status = p.innerText.toLowerCase().replace(/\s/g, "-"); // e.g., 'under review' → 'under-review'
    p.classList.add(`status-${status}`);
});