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

let adoptionChart = null;
const yearSelect = document.getElementById("yearSelect");
const categorySelect = document.getElementById("reportCategory");
const tableWrapper = document.getElementById("report-table-wrapper");
let dateSortOrder = "desc";

// ------------------- AUTH CHECK -------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        renderReport(categorySelect.value);
    } else {
        alert("You must be logged in to view reports.");
        window.location.href = "login.html";
    }
});

// ------------------- EVENT: CATEGORY CHANGE -------------------
categorySelect.onchange = () => {
    renderReport(categorySelect.value);
};

// ------------------- FETCH & RENDER REPORT -------------------
async function renderReport(category) {
    tableWrapper.innerHTML = "<p>Loading report...</p>";
    let data = [];

    // ---------------- ADOPTED ANIMALS ----------------
    if (category === "adoptedAnimals") {
        const q = query(collection(db, "requests"), where("status", "==", "approved"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tableWrapper.innerHTML = "<p>No records found.</p>";
            return;
        }

        const rawRequests = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const listingIds = [...new Set(rawRequests.map(r => r.listing_ID).filter(Boolean))];
        const userIds = [...new Set(rawRequests.map(r => r.user_ID).filter(Boolean))];

        const animalMap = {};
        await Promise.all(listingIds.map(async (id) => {
            const snap = await getDoc(doc(db, "animals", id));
            if (snap.exists()) animalMap[id] = snap.data();
        }));

        const userMap = {};
        await Promise.all(userIds.map(async (id) => {
            const snap = await getDoc(doc(db, "users", id));
            if (snap.exists()) userMap[id] = snap.data();
        }));

        data = rawRequests.map(r => {
            const animal = animalMap[r.listing_ID] || {};
            const user = userMap[r.user_ID] || {};
            return {
                id: r.id,
                animalName: animal.name ?? "Unknown",
                type: animal.type ?? "-",
                breed: animal.breed ?? "-",
                imageUrl: animal.imageUrl ?? "images/no-image.png",
                location: animal.location ?? "-",
                status: animal.status ?? "-",
                vaccinationStatus: animal.vaccinationStatus ?? "-",
                username: user.username ?? "-",
                identification_Number: user.identification_Number ?? "-",
                phone_Number: user.phone_Number ?? "-",
                email: user.email ?? "-",
                reason: r.reason ?? "-",
                environmentDesc: r.environmentDesc ?? "-",
                environmentPhoto: r.environmentPhoto ?? "images/no-image.png",
                dateAppliedRaw: r.dateApplied?.toDate ? r.dateApplied.toDate() : null,
                dateApplied: r.dateApplied?.toDate ? r.dateApplied.toDate().toLocaleDateString("en-GB") : r.dateApplied ?? "-"
            };
        });

        if (data.length > 0) {
            const defaultYear = populateYearDropdown(data, "dateAppliedRaw");
            renderQuarterChart(data, defaultYear, "dateAppliedRaw", `Animals Adopted in ${defaultYear}`);
            yearSelect.onchange = () => renderQuarterChart(data, Number(yearSelect.value), "dateAppliedRaw", `Animals Adopted in ${yearSelect.value}`);
        }
    }

    // ---------------- LOST PETS ----------------
    if (category === "lostPets") {
        const q = query(collection(db, "lostPets"), where("status", "==", "Found"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tableWrapper.innerHTML = "<p>No records found.</p>";
            return;
        }

        const rawPets = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

        // Get all unique user IDs
        const userIds = [...new Set(rawPets.map(p => p.user_id).filter(Boolean))];
        const userMap = {};
        await Promise.all(userIds.map(async (id) => {
            const snap = await getDoc(doc(db, "users", id));
            if (snap.exists()) userMap[id] = snap.data();
        }));

        // Map lostPets data
        data = rawPets.map(pet => {
            const user = userMap[pet.user_id] || {};
            return {
                id: pet.id,
                name: pet.name ?? "Unknown",
                type: pet.animal_type ?? "-",
                breed: pet.breed ?? "-",
                photo: pet.photo ?? "images/no-image.png",
                ownerName: user.username ?? "-",
                lastSeen: pet.last_seen_Location ?? "-",
                status: pet.status ?? "-",
                dateReportedRaw: pet.date_Reported?.toDate ? pet.date_Reported.toDate() : null,
                dateReported: pet.date_Reported?.toDate ? pet.date_Reported.toDate().toLocaleDateString("en-GB") : "-"
            };
        });

        if (data.length > 0) {
            const defaultYear = populateYearDropdown(data, "dateReportedRaw");
            renderQuarterChart(data, defaultYear, "dateReportedRaw", `Lost Pets Reported in ${defaultYear}`);
            yearSelect.onchange = () =>
                renderQuarterChart(data, Number(yearSelect.value), "dateReportedRaw", `Lost Pets Reported in ${yearSelect.value}`);
        }
    }

    renderTable(category, data);
}

// ------------------- RENDER TABLE -------------------
function renderTable(category, data) {
    tableWrapper.innerHTML = "";

    if (data.length === 0) {
        tableWrapper.innerHTML = "<p>No records found.</p>";
        return;
    }

    let headers = [];
    if (category === "adoptedAnimals") {
        headers = [
            "Animal Name",
            "Type / Breed",
            `<span id="dateHeader" style="cursor:pointer;">Date Applied <span id="dateArrow">${dateSortOrder === "desc" ? "▼" : "▲"}</span></span>`,
            "Name of Adopter",
            "Status",
            "Details"
        ];
    } else if (category === "lostPets") {
        headers = [
            "Pet Name",
            "Type / Breed",
            "Owner Name",
            "Last Seen Location",
            "Status",
            "Details"
        ];
    }

    const table = document.createElement("table");
    table.className = "report-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    table.appendChild(thead);

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
        } else if (category === "lostPets") {
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.type} / ${item.breed}</td>
                <td>${item.ownerName}</td>
                <td>${item.lastSeen}</td>
                <td>${item.status}</td>
                <td><button class="view-details-btn" data-category="${category}" data-id="${item.id}">View</button></td>
            `;
        }
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    document.querySelectorAll(".view-details-btn").forEach(btn => {
        btn.onclick = async () => openModal(btn.dataset.category, btn.dataset.id);
    });

    // Sort by date
    const dateHeader = document.getElementById("dateHeader");
    if (dateHeader) {
        dateHeader.onclick = () => {
            dateSortOrder = dateSortOrder === "desc" ? "asc" : "desc";
            const key = category === "adoptedAnimals" ? "dateAppliedRaw" : "foundDateRaw";
            data.sort((a, b) => {
                if (!a[key] || !b[key]) return 0;
                return dateSortOrder === "desc" ? b[key] - a[key] : a[key] - b[key];
            });
            renderTable(category, data);
        };
    }
}

// ------------------- MODAL FUNCTIONS -------------------
window.openModal = async function (category, id) {
    const modal = document.getElementById("modal");
    if (!modal) return;
    modal.classList.add("open");
    await showModalContent(category, id);
};

window.closeModal = () => {
    const modal = document.getElementById("modal");
    modal.classList.remove("open");
};

async function showModalContent(category, id) {
    const modal = document.getElementById("modal");
    const modalInfo = modal.querySelector(".modal-inner-info-container");
    const modalImage = modal.querySelector(".modalImg");
    const modalTitle = modal.querySelector(".modal-inner-top-title h1");

    if (category === "adoptedAnimals") {
        const docSnap = await getDoc(doc(db, "requests", id));
        if (!docSnap.exists()) return;
        const req = docSnap.data();
        let animal = {};
        if (req.listing_ID) {
            const animalSnap = await getDoc(doc(db, "animals", req.listing_ID));
            if (animalSnap.exists()) animal = animalSnap.data();
        }
        let user = {};
        if (req.user_ID) {
            const userSnap = await getDoc(doc(db, "users", req.user_ID));
            if (userSnap.exists()) user = userSnap.data();
        }

        modalImage.src = animal.imageUrl ?? "images/no-image.png";
        modalTitle.innerText = animal.name;
        modalInfo.innerHTML = `
            <div class="modal-inner-info-text">
                <h3>${animal.name ?? "Unknown"}</h3>
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
                <i class="fas fa-calendar-alt"></i>
                <p class="modal-inner-info-text-title">Date Applied</p>
                <span>${req.dateApplied?.toDate ? req.dateApplied.toDate().toLocaleDateString("en-GB") : "-"}</span>
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
                <p class="modal-inner-info-text-title">ID Number</p>
                <span>${user.identification_Number ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-phone"></i>
                <p class="modal-inner-info-text-title">Phone</p>
                <span>${user.phone_Number ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-envelope"></i>
                <p class="modal-inner-info-text-title">Email</p>
                <span>${user.email ?? "-"}</span>
            </div>
        `;
    }

    if (category === "lostPets") {
        const docSnap = await getDoc(doc(db, "lostPets", id));
        if (!docSnap.exists()) return;
        const pet = docSnap.data();

        let petUser = {};
        if (pet.user_id) {
            const userSnap = await getDoc(doc(db, "users", pet.user_id));
            if (userSnap.exists()) petUser = userSnap.data();
        }

        modalImage.src = pet.photo ?? "images/no-image.png";
        modalTitle.innerText = pet.name ?? "Unknown";
        modalInfo.innerHTML = `
            <div class="modal-inner-info-text">
                <h3>${pet.name ?? "Unknown"}</h3>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-paw"></i>
                <p class="modal-inner-info-text-title">Type</p>
                <span>${pet.animal_type ?? "-"} • ${pet.breed ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <p class="modal-inner-info-text-title">Last Seen Location</p>
                <span>${pet.last_seen_Location ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-calendar-alt"></i>
                <p class="modal-inner-info-text-title">Last Seen Date</p>
                <span>
        ${pet.last_seen_Date
                ? (pet.last_seen_Date.toDate
                    ? pet.last_seen_Date.toDate().toISOString().split("T")[0]  // Firestore timestamp
                    : new Date(pet.last_seen_Date).toISOString().split("T")[0] // String date
                )
                : "-"
            }
    </span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-user"></i>
                <p class="modal-inner-info-text-title">Owner Name</p>
                <span>${petUser.username ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-id-card"></i>
                <p class="modal-inner-info-text-title">ID Number</p>
                <span>${petUser.identification_Number ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-phone"></i>
                <p class="modal-inner-info-text-title">Phone</p>
                <span>${petUser.phone_Number ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-envelope"></i>
                <p class="modal-inner-info-text-title">Email</p>
                <span>${petUser.email ?? "-"}</span>
            </div>
            <div class="modal-inner-info-text modal-detail-item">
                <i class="fas fa-info-circle"></i>
                <p class="modal-inner-info-text-title">Status</p>
                <span>${pet.status ?? "-"}</span>
            </div>
        `;
    }
}

// ------------------- CHART FUNCTIONS -------------------
function populateYearDropdown(data, dateKey) {
    const years = new Set();
    data.forEach(item => {
        if (item[dateKey]) years.add(item[dateKey].getFullYear());
    });
    yearSelect.innerHTML = "";
    [...years].sort((a, b) => b - a).forEach(year => {
        const opt = document.createElement("option");
        opt.value = year;
        opt.textContent = year;
        yearSelect.appendChild(opt);
    });
    return [...years][0];
}

function buildQuarterData(data, year, dateKey) {
    const quarters = [0, 0, 0, 0];
    data.forEach(item => {
        if (!item[dateKey] || item[dateKey].getFullYear() !== year) return;
        const q = Math.floor(item[dateKey].getMonth() / 3);
        quarters[q]++;
    });
    return quarters;
}

function renderQuarterChart(data, year, dateKey, label) {
    const ctx = document.getElementById("adoptionQuarterChart").getContext("2d");
    const quarterData = buildQuarterData(data, year, dateKey);

    if (adoptionChart) adoptionChart.destroy();

    adoptionChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Q1", "Q2", "Q3", "Q4"],
            datasets: [{ label, data: quarterData }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}
