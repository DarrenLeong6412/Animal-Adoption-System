// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, query, where, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Firebase config
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

const tableWrapper = document.getElementById("report-table-wrapper");
const categoryButtons = document.querySelectorAll('input[name="report-category-button"]');
let currentCategory = "adoptedAnimals";

// Event listener for category filter
categoryButtons.forEach(input => {
    input.addEventListener("change", () => {
        currentCategory = input.id;
        renderReport(currentCategory);
    });
});

// Check login
onAuthStateChanged(auth, (user) => {
    if (user) {
        renderReport(currentCategory);
    } else {
        alert("You must be logged in to view reports.");
        window.location.href = "login.html";
    }
});

// ---------- FETCH & RENDER REPORT ----------
async function renderReport(category) {
    tableWrapper.innerHTML = "<p>Loading report...</p>";

    let data = [];

    if (category === "adoptedAnimals") {
        // 1. Fetch approved requests
        const q = query(collection(db, "requests"), where("status", "==", "approved"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tableWrapper.innerHTML = "<p>No records found.</p>";
            return;
        }

        // 2. Map raw requests
        const rawRequests = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        // 3. Collect unique animal IDs & user IDs
        const listingIds = [...new Set(rawRequests.map(r => r.listing_ID).filter(Boolean))];
        const userIds = [...new Set(rawRequests.map(r => r.user_ID).filter(Boolean))];

        // 4. Fetch animals
        const animalMap = {};
        await Promise.all(
            listingIds.map(async (animalId) => {
                const animalSnap = await getDoc(doc(db, "animals", animalId));
                if (animalSnap.exists()) animalMap[animalId] = animalSnap.data();
            })
        );

        // 5. Fetch users
        const userMap = {};
        await Promise.all(
            userIds.map(async (userId) => {
                const userSnap = await getDoc(doc(db, "users", userId));
                if (userSnap.exists()) userMap[userId] = userSnap.data();
            })
        );

        // 6. Merge request + animal + user
        data = rawRequests.map(r => {
            const animal = animalMap[r.listing_ID] || {};
            const user = userMap[r.user_ID] || {};

            return {
                id: r.id,
                // request info
                reason: r.reason ?? "—",
                dateApplied: r.dateApplied?.toDate ? r.dateApplied.toDate().toLocaleDateString("en-GB") : r.dateApplied ?? "—",
                environmentDesc: r.environmentDesc ?? "—",
                environmentPhoto: r.environmentPhoto ?? "images/no-image.png",
                // animal info
                animalName: animal.name ?? "Unknown",
                type: animal.type ?? "—",
                breed: animal.breed ?? "—",
                imageUrl: animal.imageUrl ?? "images/no-image.png",
                location: animal.location ?? "—",
                status: animal.status ?? "unknown",
                vaccinationStatus: animal.vaccinationStatus ?? "—",
                // user info
                username: user.username ?? "—",
                identification_Number: user.identification_Number ?? "—",
                phone_Number: user.phone_Number ?? "—",
                email: user.email ?? "—"
            };
        });

    } else if (category === "resolvedLostPets") {
        // 1. Fetch found lost pets
        const q = query(collection(db, "lostPets"), where("status", "==", "Found"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tableWrapper.innerHTML = "<p>No records found.</p>";
            return;
        }

        // 2. Map raw lost pets
        const rawPets = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        // 3. Collect unique user IDs
        const userIds = [...new Set(rawPets.map(p => p.user_id).filter(Boolean))];

        // 4. Fetch users
        const userMap = {};
        await Promise.all(
            userIds.map(async (userId) => {
                const userSnap = await getDoc(doc(db, "users", userId));
                if (userSnap.exists()) userMap[userId] = userSnap.data();
            })
        );

        // 5. Merge pet + user
        data = rawPets.map(p => {
            const user = userMap[p.user_id] || {};

            return {
                id: p.id,
                name: p.name ?? "Unknown",
                breed: p.breed ?? "—",
                age: p.age ?? "—",
                gender: p.gender ?? "—",
                lastSeenDate: p.last_seen_Date ?? "—",
                lastSeenLocation: p.last_seen_Location ?? "—",
                date_Reported: p.date_Reported?.toDate ? p.date_Reported.toDate().toLocaleDateString("en-GB") : p.date_Reported ?? "—",
                description: p.description ?? "—",
                photo: p.photo ?? "images/no-image.png",
                status: p.status ?? "—",
                // user info
                username: user.username ?? "—",
                identification_Number: user.identification_Number ?? "—",
                phone_Number: user.phone_Number ?? "—",
                email: user.email ?? "—"
            };
        });
    }

    // 7. Render the table
    renderTable(category, data);
}


// ---------- TABLE RENDER ----------
function renderTable(category, data) {
    tableWrapper.innerHTML = "";

    if (data.length === 0) {
        tableWrapper.innerHTML = "<p>No records found.</p>";
        return;
    }

    let headers = [];
    if (category === "adoptedAnimals") {
        headers = ["Animal Name", "Type / Breed", "Date Applied", "Name of Adopter", "Status", "Details"];
    } else {
        headers = ["Name", "Breed", "Age", "Gender", "Last Seen Date", "Last Seen Location", "Date Reported", "Reporter Email", "Details"];
    }

    const table = document.createElement("table");
    table.className = "report-table";

    // Table header
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");
    data.forEach(item => {
        const tr = document.createElement("tr");

        if (category === "adoptedAnimals") {
            tr.innerHTML = `
        <td>${item.animalName}</td>
        <td>${item.type} / ${item.breed}</td>
        <td>${item.dateApplied}</td>
        <td>${item.username}</td>
        <td>${item.status}</td>
        <td><button class="view-details-btn" data-category="${category}" data-id="${item.id}">View</button></td>
      `;
        } else {
            tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.breed}</td>
        <td>${item.age}</td>
        <td>${item.gender}</td>
        <td>${item.lastSeenDate}</td>
        <td>${item.lastSeenLocation}</td>
        <td>${item.date_Reported}</td>
        <td>${item.reporterEmail}</td>
        <td><button class="view-details-btn" data-category="${category}" data-id="${item.id}">View</button></td>
      `;
        }

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    // Attach click listeners to all view buttons
    document.querySelectorAll(".view-details-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const cat = btn.dataset.category;
            const id = btn.dataset.id;
            await openModal(cat, id);
        });
    });
}

// ---------- OPEN MODAL ----------
window.openModal = async function (category, id) {
    const modal = document.getElementById("modal");
    if (!modal) {
        console.error("Modal element not found!");
        return;
    }
    modal.classList.add("open");
    await showModalContent(category, id);
};

// ---------- CLOSE MODAL ----------
window.closeModal = function () {
    const modal = document.getElementById("modal");
    modal.classList.remove("open");
};

async function showModalContent(category, id) {
    const modalInfoContainer = document.querySelector(".modal-inner-info-container");
    const modalImage = document.querySelector(".modalImg");
    const modalTitle = modal.querySelector(".modal-inner-top-title h1");

    if (category === "adoptedAnimals") {
        const docSnap = await getDoc(doc(db, "requests", id));
        if (!docSnap.exists()) {
            modalInfoContainer.innerHTML = "<p>No data found.</p>";
            modalImage.src = "images/no-image.png";
            return;
        }

        const req = docSnap.data();

        // Fetch animal data if available
        let animal = {};
        if (req.listing_ID) {
            const animalSnap = await getDoc(doc(db, "animals", req.listing_ID));
            if (animalSnap.exists()) animal = animalSnap.data();
        }

        // Fetch user/applicant data if available
        let user = {};
        if (req.user_ID) {
            const userSnap = await getDoc(doc(db, "users", req.user_ID));
            if (userSnap.exists()) user = userSnap.data();
        }

        modalImage.src = animal.imageUrl ?? "images/no-image.png";
        modalTitle.innerText = animal.name;

        modalInfoContainer.innerHTML = `

            <div class="modal-inner-info-text">
                <h3 id="modalName">${animal.name ?? "Unknown"}</h3>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-paw"></i>
                <p class="modal-inner-info-text-title">Type</p>
                <span>${animal.type ?? "-"} • ${animal.breed ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <p class="modal-inner-info-text-title">Location</p>
                <span>${animal.location ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-syringe"></i>
                <p class="modal-inner-info-text-title">Vaccination</p>
                <span>${animal.vaccinationStatus ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-calendar-alt"></i>
                <p class="modal-inner-info-text-title">Date Applied</p>
                <span>${req.dateApplied?.toDate ? req.dateApplied.toDate().toLocaleDateString("en-GB") : req.dateApplied ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text">
                <h3>Applicant Details</h3>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-user"></i>
                <p class="modal-inner-info-text-title">Submitted By</p>
                <span>${user.username ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-id-card"></i>
                <p class="modal-inner-info-text-title">Identification Number</p>
                <span>${user.identification_Number ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-phone"></i>
                <p class="modal-inner-info-text-title">Phone Number</p>
                <span>${user.phone_Number ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-envelope"></i>
                <p class="modal-inner-info-text-title">Email</p>
                <span>${user.email ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-info-circle"></i>
                <p class="modal-inner-info-text-title">Status</p>
                <span>${animal.status}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-question-circle"></i>
                <p class="modal-inner-info-text-title">
                    Why do you want to adopt ${animal.name ?? "this animal"}?
                </p>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <span>${req.reason ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-home"></i>
                <p class="modal-inner-info-text-title">Home Environment Description</p>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <span>${req.environmentDesc ?? "-"}</span>
            </div>

            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-image"></i>
                <p class="modal-inner-info-text-title">Home Environment Photo</p>
            </div>
            <img src="${req.environmentPhoto ?? "images/no-image.png"}" alt="Home Environment" class="modal-environment-photo"/>
        `;
    }

    // TODO: add similar structure for resolvedLostPets if needed
}

function capitalizeStatus(status) {
    return status
        .split(" ")
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join(" ");
}