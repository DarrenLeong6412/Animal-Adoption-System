// js/myListings.js

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

let myUserListings = [];

/* ================================
   AUTH
================================ */
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserListings(user.uid);
    } else {
        const grid = document.getElementById("myListingsGrid");
        if (grid) {
            grid.innerHTML = '<p class="my-listings-loading">Please log in to view listings.</p>';
        }
    }
});

/* ================================
   LOAD LISTINGS
================================ */
async function loadUserListings(userId) {
    const grid = document.getElementById("myListingsGrid");
    if (!grid) return;

    try {
        const q = query(collection(db, "animals"), where("createdBy", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            grid.innerHTML = '<p class="my-listings-loading">You haven\'t created any listings yet.</p>';
            return;
        }

        myUserListings = [];
        grid.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id;
            myUserListings.push(data);
        });

        // STATUS PRIORITY
        myUserListings.sort((a, b) => {
            const statusOrder = {
                Pending: 1,
                Available: 2,
                Adopted: 3,
                Rejected: 4
            };

            const sA = statusOrder[a.status] ?? 99;
            const sB = statusOrder[b.status] ?? 99;

            if (sA !== sB) return sA - sB;

            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tB - tA;
        });

        myUserListings.forEach((data) => {
            let badgeClass = "badge-pending";
            let statusText = data.status;

            if (data.status === "Available") {
                badgeClass = "badge-approved";
                statusText = "Approved";
            } else if (data.status === "Rejected") {
                badgeClass = "badge-rejected";
            } else if (data.status === "Adopted") {
                badgeClass = "badge-adopted";
            }

            const dateStr = data.createdAt?.seconds
                ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("en-GB")
                : "Date Unknown";

            grid.innerHTML += `
                <div onclick="window.openUserListingModal('${data.id}')" class="listing-item-card">
                    <div class="listing-item-img-container">
                        <img src="${data.imageUrl || 'images/no-image.png'}" class="listing-item-img">
                    </div>
                    <div class="listing-item-content">
                        <h3 class="listing-item-title">${data.name}</h3>
                        <p class="listing-item-meta">${data.type} • ${dateStr}</p>
                    </div>
                    <div class="listing-item-badge-container">
                        <span class="listing-item-badge ${badgeClass}">
                            ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color:red;text-align:center;">Error loading your listings.</p>';
    }
}

/* ================================
   MODAL
================================ */
window.openUserListingModal = function (id) {
    const data = myUserListings.find(i => i.id === id);
    if (!data) return;

    const modal = document.getElementById("userListingModal");
    const container = modal.querySelector(".modal-inner-info-container");

    document.getElementById("modalEditImg").src = data.imageUrl || "images/no-image.png";

    // =========================
    // EDIT ONLY IF PENDING
    // =========================
    if (data.status === "Pending") {
        document.getElementById("modalEditTitle").innerText = "Edit Listing";

        const opt = (v, c) => `<option value="${v}" ${v === c ? "selected" : ""}>${v}</option>`;

        container.innerHTML = `
            <input type="hidden" id="editDocId" value="${data.id}">

            <label>Name</label>
            <input id="editName" value="${data.name}">

            <label>Type</label>
            <select id="editType">
                ${opt("Dog", data.type)}
                ${opt("Cat", data.type)}
                ${opt("Rabbit", data.type)}
                ${opt("Bird", data.type)}
                ${opt("Other", data.type)}
            </select>

            <label>Breed</label>
            <input id="editBreed" value="${data.breed}">

            <label>Age (Months)</label>
            <input type="number" id="editAge" value="${data.age}">

            <label>Gender</label>
            <select id="editGender">
                ${opt("Male", data.gender)}
                ${opt("Female", data.gender)}
            </select>

            <label>Location</label>
            <input id="editLocation" value="${data.location}">

            <label>Vaccination</label>
            <select id="editVaccine">
                ${opt("Vaccinated", data.vaccinationStatus)}
                ${opt("Not Vaccinated", data.vaccinationStatus)}
                ${opt("Not specified", data.vaccinationStatus)}
            </select>

            <label>Description</label>
            <textarea id="editDescription">${data.description}</textarea>

            <div class="edit-status-text status-text-pending">Pending</div>

            <button id="btnSaveChanges" onclick="saveUserListing()">Save Changes</button>
        `;
    }
    // =========================
    // VIEW MODE
    // =========================
    else {
        document.getElementById("modalEditTitle").innerText = "View Details";

        let statusMap = {
            Available: { text: "Approved", bg: "#d1fae5", color: "#166534" },
            Adopted: { text: "Adopted", bg: "#e0f2fe", color: "#0369a1" },
            Rejected: { text: "Rejected", bg: "#fee2e2", color: "#dc2626" }
        };

        const s = statusMap[data.status];

        container.innerHTML = `
            <h2>${data.name}</h2>
            <p>${data.type} • ${data.breed}</p>
            <p>${data.age} months • ${data.gender}</p>
            <p>${data.location}</p>
            <p>${data.vaccinationStatus || "Not specified"}</p>
            <p>${data.description || "No description"}</p>

            <div style="
                margin-top:20px;
                padding:12px;
                background:${s.bg};
                color:${s.color};
                border-radius:8px;
                font-weight:bold;
                text-align:center;">
                ${s.text}
            </div>

            <p style="font-size:12px;text-align:center;color:#888;">
                *This listing can no longer be edited.
            </p>
        `;
    }

    modal.classList.add("open");
};

/* ================================
   CLOSE MODAL
================================ */
window.closeUserModal = function () {
    document.getElementById("userListingModal").classList.remove("open");
};

/* ================================
   SAVE
================================ */
window.saveUserListing = async function () {
    const id = document.getElementById("editDocId").value;
    const btn = document.getElementById("btnSaveChanges");

    const name = document.getElementById("editName").value.trim();
    if (!name) return alert("Name is required");

    const snap = await getDoc(doc(db, "animals", id));
    if (!snap.exists() || snap.data().status !== "Pending") {
        alert("Listing is no longer editable.");
        closeUserModal();
        loadUserListings(auth.currentUser.uid);
        return;
    }

    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        await updateDoc(doc(db, "animals", id), {
            name,
            type: editType.value,
            breed: editBreed.value,
            age: editAge.value,
            gender: editGender.value,
            location: editLocation.value,
            vaccinationStatus: editVaccine.value,
            description: editDescription.value
        });

        alert("Updated successfully");
        closeUserModal();
        loadUserListings(auth.currentUser.uid);

    } catch (e) {
        alert("Update failed");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Changes";
    }
};
