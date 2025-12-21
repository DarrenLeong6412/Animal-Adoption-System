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

// 1. Wait for Auth
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserListings(user.uid);
    } else {
        const grid = document.getElementById("myListingsGrid");
        if(grid) grid.innerHTML = '<p class="my-listings-loading">Please log in to view listings.</p>';
    }
});

// 2. Load User Listings
async function loadUserListings(userId) {
    const grid = document.getElementById("myListingsGrid");
    if(!grid) return; 

    try {
        const q = query(collection(db, "animals"), where("createdBy", "==", userId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p class="my-listings-loading">You haven\'t created any listings yet.</p>';
            return;
        }

        grid.innerHTML = "";
        myUserListings = [];

        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            data.id = docSnapshot.id;
            myUserListings.push(data);
        });

        myUserListings.sort((a, b) => {
            const statusOrder = { "Pending": 1, "Available": 2, "Adopted": 3, "Rejected": 4};
            const statusA = statusOrder[a.status] || 99;
            const statusB = statusOrder[b.status] || 99;
            if (statusA !== statusB) return statusA - statusB;
            const timeA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
            const timeB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
            return timeB - timeA;
        });

        // Render Grid
        myUserListings.forEach((data) => {
            let badgeClass = "badge-pending";
            let statusText = "Pending";

            if (data.status === "Available") {
                badgeClass = "badge-approved";
                statusText = "Approved";
            } else if (data.status === "Rejected") {
                badgeClass = "badge-rejected";
                statusText = "Rejected";
            } else if (data.status === "Adopted") {
                badgeClass = "badge-adopted";
                statusText = "Adopted";
            }

            const dateStr = data.createdAt && data.createdAt.seconds 
                ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("en-GB")
                : "Date Unknown";

            const cardHTML = `
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
            grid.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p style="color:red; text-align:center;">Error loading your listings.</p>';
    }
}

// 3. Open Modal (Dynamic Logic)
window.openUserListingModal = function(id) {
    const data = myUserListings.find(item => item.id === id);
    if (!data) return;

    const modal = document.getElementById("userListingModal");
    
    // Set Header Image
    document.getElementById("modalEditImg").src = data.imageUrl || 'images/no-image.png';
    
    const container = document.querySelector("#userListingModal .modal-inner-info-container");
    
   
    //STATUS IS PENDING - ALLOW EDITING
    if (data.status === "Pending") {
        document.getElementById("modalEditTitle").innerText = "Edit Listing";
        
        const getOption = (val, current) => `<option value="${val}" ${current === val ? 'selected' : ''}>${val}</option>`;

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
                    <input type="number" id="editAge" class="edit-form-input" value="${data.age}">
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

            <div class="edit-form-group">
                <label class="edit-form-label">Current Status</label>
                <div class="edit-status-text status-text-pending">Pending</div>
            </div>

            <button id="btnSaveChanges" class="btn-save-changes" onclick="saveUserListing()">
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

// 4. Close Modal
window.closeUserModal = function() {
    document.getElementById("userListingModal").classList.remove("open");
};

// 5. Save Changes (With Strict Validation)
window.saveUserListing = async function() {
    const id = document.getElementById("editDocId").value;
    const btn = document.getElementById("btnSaveChanges");

    // --- 1. GET VALUES ---
    const nameVal = document.getElementById('editName').value.trim();
    const breedVal = document.getElementById('editBreed').value.trim();
    const locVal = document.getElementById('editLocation').value.trim();
    const descVal = document.getElementById('editDescription').value.trim();
    const ageInput = document.getElementById('editAge').value;
    const typeVal = document.getElementById('editType').value;
    const genderVal = document.getElementById('editGender').value;
    const vaccineVal = document.getElementById('editVaccine').value;

    // --- 2. VALIDATION CHECKS (Matches addListing.js) ---
    
    // Name Validation
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (nameVal.length < 1) {
        alert("Invalid Name: Please enter a name.");
        return;
    }
    if (!nameRegex.test(nameVal)) {
        alert("Invalid Name: Name must contain only alphabets (no numbers or symbols).");
        return;
    }

    // Location Validation
    if (locVal.length < 3) {
        alert("Invalid Location: Please provide a specific location.");
        return;
    }

    // Description Validation
    if (descVal.length < 10) {
        alert("Description too short: Please provide at least 10 characters describing the animal.");
        return;
    }

    // Age Validation
    const ageInt = parseInt(ageInput);
    if (isNaN(ageInt) || ageInt < 0) {
        alert("Invalid Age: Age cannot be negative.");
        return; 
    }
    if (ageInt > 300) { 
        alert("Invalid Age: Please check the age (value seems too high for months).");
        return;
    }

    // --- 3. FIREBASE STATUS CHECK ---
    // Ensure the item is still Pending before writing
    try {
        const currentDoc = await getDoc(doc(db, "animals", id));
        if (currentDoc.exists() && currentDoc.data().status !== "Pending") {
            alert("This listing is no longer Pending and cannot be edited.");
            closeUserModal();
            loadUserListings(auth.currentUser.uid);
            return;
        }
    } catch (err) {
        console.error("Error checking status:", err);
        return;
    }

    // --- 4. UPDATE FIRESTORE ---
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const docRef = doc(db, "animals", id);
        
        await updateDoc(docRef, {
            name: nameVal,
            type: typeVal,
            breed: breedVal || "Unknown",
            age: ageInt.toString(), // Store as string to match addListing format
            gender: genderVal,
            location: locVal,
            vaccinationStatus: vaccineVal,
            description: descVal
        });

        alert("Listing updated successfully!");
        closeUserModal();
        if(auth.currentUser) loadUserListings(auth.currentUser.uid);

    } catch (error) {
        console.error("Update failed", error);
        alert("Failed to update listing: " + error.message);
    } finally {
        if(btn) {
            btn.innerText = "Save Changes";
            btn.disabled = false;
        }
    }
};