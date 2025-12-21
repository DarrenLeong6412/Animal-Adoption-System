// js/displayListing.js

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
    writeBatch,
    updateDoc,
    where,
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
const auth = getAuth(app);
const db = getFirestore(app);

let allListings = [];
let currentUser = null;
let isAdmin = false;

// 1. Wait for Auth & Check Admin Role
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        await checkAdminStatus(user.uid);
    }
    loadAnimals();
});

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

async function loadAnimals() {
    const grid = document.getElementById("listingGrid");
    grid.innerHTML = '<p style="text-align:center; width:100%;">Loading animals...</p>';

    try {
        const q = query(collection(db, "animals"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No animals available for adoption right now.</p>';
            return;
        }

        allListings = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;

            if (data.createdAt && data.createdAt.seconds) {
                const dateObj = new Date(data.createdAt.seconds * 1000);
                data.formattedDate = dateObj.toLocaleDateString("en-GB", {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            } else {
                data.formattedDate = "Date Unknown";
            }

            allListings.push(data);
        });

        filterAndRender();
        setupFilters();

    } catch (error) {
        console.error("Error:", error);
        grid.innerHTML = '<p style="color:red;">Error loading data.</p>';
    }
}

function renderGrid(dataList) {
    const grid = document.getElementById("listingGrid");
    grid.innerHTML = "";

    const publicList = dataList.filter(animal => animal.status === "Available");

    if (publicList.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No animals found matching your criteria.</p>';
        return;
    }

    publicList.forEach((animal) => {
        let badgeStyle = "background-color: #d1fae5; color: #166534;";
        let statusText = "Available";
        const breedDisplay = animal.breed ? `${animal.type} • ${animal.breed}` : animal.type;

        let adminMenu = "";
        if (isAdmin) {
            adminMenu = `
                <div class="card-menu" onclick="event.stopPropagation()">
                    <div class="menu-icon" onclick="toggleMenu('${animal.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </div>
                    <div id="menu-${animal.id}" class="menu-dropdown">
                        <div onclick="editListing('${animal.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </div>
                        <div onclick="deleteListing('${animal.id}')" style="color: #dc2626;">
                            <i class="fas fa-trash"></i> Delete
                        </div>
                    </div>
                </div>
            `;
        }

        const cardHTML = `
            <div class="listing-card" onclick="openModalById('${animal.id}')" style="position: relative;">
                <div class="listing-card-img-container">
                    ${adminMenu}
                    <img src="${animal.imageUrl}" alt="${animal.name}" class="listing-card-img">
                    <div class="listing-card-status">
                        <p style="${badgeStyle}">${statusText}</p>
                    </div>
                </div>
                <div class="listing-card-info-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
                        <p class="listing-card-animal-name" style="margin:0;">${animal.name}</p>
                        <span style="font-size:11px; color:#888; font-weight:500;">${animal.formattedDate}</span>
                    </div>
                    <p>${breedDisplay} • ${animal.age} Months • ${animal.gender}</p>
                    <div class="listing-card-details-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${animal.location}</span>
                    </div>
                    <div class="listing-card-details-row">
                        <i class="fas fa-syringe"></i>
                        <span>${animal.vaccinationStatus || 'Not specified'}</span>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

//ADMIN FUNCTIONS

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
    if (!e.target.closest('.card-menu')) {
        document.querySelectorAll('.menu-dropdown').forEach(el => el.style.display = 'none');
    }

    // Close Modal on outside click
    const modal = document.getElementById("animalModal");
    if (e.target == modal) {
        window.closeAnimalModal();
    }
});

// Modal Close Function
window.closeAnimalModal = function () {
    document.getElementById("animalModal").classList.remove("open");
};

window.deleteListing = async function (id) {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {

        // Delete every req of the same animal
        const q = query(
            collection(db, "requests"),
            where("listing_ID", "==", id)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.forEach(docSnap => {
            console.log("Queuing delete for request:", docSnap.id);
            batch.delete(docSnap.ref);
        });

        await batch.commit();
        // Delete animal listing
        await deleteDoc(doc(db, "animals", id));
        alert("Listing deleted successfully.");
        loadAnimals();
    } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete listing.");
    }
};

// DYNAMIC MODAL LOGIC (VIEW vs EDIT)
// 1. OPEN VIEW MODE (Read Only)
window.openModalById = function (id) {

    const data = allListings.find(a => a.id === id);
    if (!data) return;

    document.getElementById('modalMainTitle').innerText = data.name + "'s Details";
    document.getElementById('modalImg').src = data.imageUrl || 'images/no-image.png';
    const container = document.getElementById('modalContentContainer');

    container.innerHTML = `
        <h2 id="modalName">${data.name}</h2>

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

        <h3 id="modalAboutTitle" style="color: #0d3b25; font-size: 18px; font-weight: 700; margin-top: 25px; margin-bottom: 8px;">About ${data.name}</h3>
        
        <p style="color: #555; line-height: 1.6; font-size: 14px; margin-top: 0;">
            ${data.description || 'No description provided.'}
        </p>

        <button id="adoptButton" class="btn-save-changes">
            Adopt Me
        </button>
    `;

    document.getElementById("adoptButton").onclick = async function () {
        try {
            // Create query: requests for this animal with status "pending"
            const q = query(
                collection(db, "requests"),
                where("listing_ID", "==", data.id),
                where("status", "==", "pending"),
                where("user_ID", "==", currentUser.uid)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                alert("You have already requested to adopt this animal, please wait until a decision has been made for your current request.");
                return; // Stop further action
            }

            // No pending requests → proceed
            window.location.href = `adoptionForm.html?listingID=${data.id}`;
        } catch (error) {
            console.error("Error checking pending requests:", error);
            alert("Unable to check adoption requests. Please try again later.");
        }
    };

    document.getElementById("animalModal").classList.add("open");
};

// 2. OPEN EDIT MODE 
window.editListing = function (id) {
    const data = allListings.find(a => a.id === id);
    if (!data) return;

    document.getElementById('modalMainTitle').innerText = "Edit Listing";
    document.getElementById('modalImg').src = data.imageUrl || 'images/no-image.png';
    const container = document.getElementById('modalContentContainer');

    const getOption = (val, current) => `
        <option value="${val}" ${current === val ? 'selected' : ''}>${val}</option>
    `;

    container.innerHTML = `
        <input type="hidden" id="editDocId" value="${data.id}">

        <div class="edit-form-group">
            <label class="edit-form-label">Animal Name</label>
            <input type="text" id="editName" class="edit-form-input" value="${data.name}">
        </div>

        <div class="form-row-split">
             <div class="edit-form-group form-group-half">
                <label class="edit-form-label">Type</label>
                <select id="editType" class="edit-form-input">
                    ${getOption('Dog', data.type)}
                    ${getOption('Cat', data.type)}
                    ${getOption('Rabbit', data.type)}
                    ${getOption('Bird', data.type)}
                    ${getOption('Other', data.type)}
                </select>
            </div>
            <div class="edit-form-group form-group-half">
                <label class="edit-form-label">Breed</label>
                <input type="text" id="editBreed" class="edit-form-input" value="${data.breed}">
            </div>
        </div>

         <div class="form-row-split">
            <div class="edit-form-group form-group-half">
                <label class="edit-form-label">Age (Months)</label>
                <input type="number" id="editAge" class="edit-form-input" min="0" value="${data.age}">
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
            <label class="edit-form-label">Location</label>
            <input type="text" id="editLocation" class="edit-form-input" value="${data.location}">
        </div>

        <div class="edit-form-group">
            <label class="edit-form-label">Vaccination Status</label>
            <select id="editVaccine" class="edit-form-input">
                ${getOption('Vaccinated', data.vaccinationStatus)}
                ${getOption('Not Vaccinated', data.vaccinationStatus)}
                ${getOption('Not specified', data.vaccinationStatus)}
            </select>
        </div>

        <div class="edit-form-group">
            <label class="edit-form-label">Description</label>
            <textarea id="editDescription" class="edit-form-textarea">${data.description}</textarea>
        </div>

        <button id="saveChangesBtn" class="btn-save-changes">
            Save Changes
        </button>
    `;

    document.getElementById("saveChangesBtn").onclick = handleSaveChanges;

    document.getElementById("animalModal").classList.add("open");
};

// 3. HANDLE SAVE (With Strict Validation)
async function handleSaveChanges() {
    const id = document.getElementById("editDocId").value;
    const btn = document.getElementById("saveChangesBtn");

    // --- 1. GET VALUES ---
    const nameVal = document.getElementById('editName').value.trim();
    const breedVal = document.getElementById('editBreed').value.trim();
    const locVal = document.getElementById('editLocation').value.trim();
    const descVal = document.getElementById('editDescription').value.trim();
    const ageInput = document.getElementById('editAge').value;
    
    // Dropdown values
    const typeVal = document.getElementById('editType').value;
    const genderVal = document.getElementById('editGender').value;
    const vaccineVal = document.getElementById('editVaccine').value;

    // --- 2. VALIDATION CHECKS ---

    // A. Name Validation
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (nameVal.length < 1) {
        alert("Invalid Name: Please enter a name.");
        return;
    }
    if (!nameRegex.test(nameVal)) {
        alert("Invalid Name: Name must contain only alphabets (no numbers or symbols).");
        return;
    }

    // B. Location Validation
    if (locVal.length < 3) {
        alert("Invalid Location: Please provide a specific location.");
        return;
    }

    // C. Description Validation
    if (descVal.length < 10) {
        alert("Description too short: Please provide at least 10 characters describing the animal.");
        return;
    }

    // D. Age Validation
    const ageInt = parseInt(ageInput);
    if (isNaN(ageInt) || ageInt < 0) {
        alert("Invalid Age: Age cannot be negative.");
        return; 
    }
    if (ageInt > 300) { 
        alert("Invalid Age: Please check the age (value seems too high for months).");
        return;
    }

    // --- 3. EXECUTE UPDATE ---
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const docRef = doc(db, "animals", id);
        
        await updateDoc(docRef, {
            name: nameVal,
            type: typeVal,
            breed: breedVal || "Unknown", // Default to Unknown if empty
            age: ageInt.toString(),       // Store as string to remain consistent with addListing
            gender: genderVal,
            location: locVal,
            vaccinationStatus: vaccineVal,
            description: descVal
        });

        alert("Listing updated successfully!");
        document.getElementById('animalModal').classList.remove('open');
        loadAnimals(); // Refresh the grid to show new changes

    } catch (error) {
        console.error("Update failed", error);
        alert("Update failed: " + error.message);
    } finally {
        if (btn) {
            btn.innerText = "Save Changes";
            btn.disabled = false;
        }
    }
}

// FILTERS 
function setupFilters() {
    const searchInput = document.getElementById("filterSearch");
    const ageInput = document.getElementById("filterAge");
    const typeInput = document.getElementById("filterType");
    const genderInput = document.getElementById("filterGender");

    if (searchInput) searchInput.addEventListener("input", filterAndRender);
    if (ageInput) ageInput.addEventListener("input", filterAndRender);
    if (typeInput) typeInput.addEventListener("change", filterAndRender);
    if (genderInput) genderInput.addEventListener("change", filterAndRender);
}

function filterAndRender() {
    const searchText = document.getElementById("filterSearch").value.toLowerCase();
    const ageVal = document.getElementById("filterAge").value;
    const typeVal = document.getElementById("filterType").value;
    const genderVal = document.getElementById("filterGender").value;

    const filteredData = allListings.filter(animal => {
        const nameMatch = animal.name.toLowerCase().includes(searchText);
        const breedMatch = (animal.breed || "").toLowerCase().includes(searchText);
        const searchPass = nameMatch || breedMatch;

        let agePass = true;
        if (ageVal !== "") agePass = parseInt(animal.age) == parseInt(ageVal);

        let typePass = true;
        const standardTypes = ["Dog", "Cat", "Bird", "Rabbit"];
        if (typeVal === "Other") typePass = !standardTypes.includes(animal.type);
        else if (typeVal !== "All") typePass = animal.type === typeVal;

        let genderPass = true;
        if (genderVal !== "All") genderPass = animal.gender === genderVal;

        return searchPass && agePass && typePass && genderPass;
    });

    renderGrid(filteredData);
}



loadAnimals();


