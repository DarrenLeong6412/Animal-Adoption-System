// js/myListings.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
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

// Store listings locally for easy modal access
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
    if(!grid) return; // Safety check

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
            myUserListings.push(data); // Save to array
            
            // Badge Logic
            let badgeClass = "badge-pending";
            let statusText = "Pending";

            if (data.status === "Available") {
                badgeClass = "badge-approved";
                statusText = "Approved";
            } else if (data.status === "Rejected") {
                badgeClass = "badge-rejected";
                statusText = "Rejected";
            }

            const dateStr = data.createdAt && data.createdAt.seconds 
                ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("en-GB")
                : "Date Unknown";

            // Clickable Card HTML
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

// 3. Open Modal (Global Function)
window.openUserListingModal = function(id) {
    const data = myUserListings.find(item => item.id === id);
    if (!data) return;

    const modal = document.getElementById("userListingModal");
    const saveBtn = document.getElementById("btnSaveChanges");
    const statusEl = document.getElementById("editStatusDisplay");
    
    // Populate Image & ID
    document.getElementById("modalEditImg").src = data.imageUrl || 'images/no-image.png';
    document.getElementById("editDocId").value = data.id;

    // Populate Fields
    document.getElementById('editName').value = data.name || "";
    document.getElementById('editType').value = data.type || "";
    document.getElementById('editBreed').value = data.breed || "";
    document.getElementById('editAge').value = data.age || "";
    document.getElementById('editLocation').value = data.location || "";
    document.getElementById('editDescription').value = data.description || "";

    // Status Styling
    statusEl.innerText = data.status || "Pending";
    statusEl.className = "edit-status-text"; // Reset class

    const inputs = ['editName', 'editType', 'editBreed', 'editAge', 'editLocation', 'editDescription'];

    if (data.status === "Pending") {
        statusEl.classList.add("status-text-pending");
        saveBtn.style.display = "block";
        document.getElementById("modalEditTitle").innerText = "Edit Listing";
        
        // Enable Inputs
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.removeAttribute("readonly");
                el.style.backgroundColor = "white";
                el.style.border = "1px solid #ddd";
            }
        });
    } else {
        if (data.status === "Available") statusEl.classList.add("status-text-approved");
        else statusEl.classList.add("status-text-rejected");

        saveBtn.style.display = "none";
        document.getElementById("modalEditTitle").innerText = "View Details";
        
        // Disable Inputs (Read-only mode)
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.setAttribute("readonly", true);
                el.style.backgroundColor = "#f9fafb";
                el.style.border = "none";
            }
        });
    }

    modal.classList.add("open");
};

// 4. Close Modal (Global Function)
window.closeUserModal = function() {
    document.getElementById("userListingModal").classList.remove("open");
};

// 5. Save Changes (Global Function)
window.saveUserListing = async function() {
    const id = document.getElementById("editDocId").value;
    const btn = document.getElementById("btnSaveChanges");
    
    // Basic Validation
    const name = document.getElementById('editName').value;
    if(!name) { alert("Name is required"); return; }

    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const docRef = doc(db, "animals", id);
        await updateDoc(docRef, {
            name: name,
            type: document.getElementById('editType').value,
            breed: document.getElementById('editBreed').value,
            age: document.getElementById('editAge').value,
            location: document.getElementById('editLocation').value,
            description: document.getElementById('editDescription').value
        });

        alert("Listing updated successfully!");
        closeUserModal();
        
        // Refresh the list to show new data
        if(auth.currentUser) loadUserListings(auth.currentUser.uid);

    } catch (error) {
        console.error("Update failed", error);
        alert("Failed to update listing: " + error.message);
    } finally {
        btn.innerText = "Save Changes";
        btn.disabled = false;
    }
};