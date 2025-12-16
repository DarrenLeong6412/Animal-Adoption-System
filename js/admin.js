// js/admin.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    doc, 
    updateDoc 
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

let pendingListings = [];
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadPendingListings();
    } else {
        alert("Access Denied: Please login.");
        window.location.href = "login.html";
    }
});

async function loadPendingListings() {
    const grid = document.getElementById("adminGrid");
    grid.innerHTML = '<p style="text-align:center; width:100%;">Loading pending requests...</p>';

    try {
        const q = query(
            collection(db, "animals"), 
            where("status", "==", "Pending"),
            orderBy("createdAt", "asc")
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No pending approvals.</p>';
            return;
        }

        pendingListings = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            
            // Format Date
            if (data.createdAt && data.createdAt.seconds) {
                const dateObj = new Date(data.createdAt.seconds * 1000);
                data.formattedDate = dateObj.toLocaleDateString("en-GB", {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            } else {
                data.formattedDate = "Unknown";
            }

            pendingListings.push(data);
        });

        renderGrid(pendingListings);

    } catch (error) {
        console.error("Error:", error);
        if (error.code === 'failed-precondition') {
             grid.innerHTML = '<p style="color:red; text-align:center;">⚠️ <strong>Missing Index!</strong><br>Open browser console (F12) and click the link from Firebase to create it.</p>';
        } else {
             grid.innerHTML = '<p style="color:red;">Error loading data: ' + error.message + '</p>';
        }
    }
}

function renderGrid(dataList) {
    const grid = document.getElementById("adminGrid");
    grid.innerHTML = ""; 

    dataList.forEach((animal) => {
        const breedDisplay = animal.breed ? `${animal.type} • ${animal.breed}` : animal.type;

        const cardHTML = `
            <div class="listing-card">
                <div class="listing-card-img-container" onclick="openAdminModal('${animal.id}')" style="cursor:pointer;">
                    <img src="${animal.imageUrl}" alt="${animal.name}" class="listing-card-img">
                    <div class="listing-card-status">
                        <p class="status-badge status-pending">Pending</p>
                    </div>
                </div>
                <div class="listing-card-info-section">
                    
                    <div class="submission-info">
                        <strong>User:</strong> ${animal.ownerEmail} <br>
                        <strong>Posted:</strong> ${animal.formattedDate}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
                        <p class="listing-card-animal-name" style="margin:0;">${animal.name}</p>
                    </div>
                    
                    <p>${breedDisplay}</p>
                    
                    <div class="admin-action-row">
                        <button class="btn-approve" onclick="updateListingStatus('${animal.id}', 'Available')">Approve</button>
                        <button class="btn-reject" onclick="updateListingStatus('${animal.id}', 'Rejected')">Reject</button>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

// --- UPDATE STATUS FUNCTION ---
window.updateListingStatus = async function(docId, newStatus) {
    let confirmMsg = newStatus === 'Available' ? "Approve this listing?" : "Reject this listing?";
    if (!confirm(confirmMsg)) return;

    try {
        const docRef = doc(db, "animals", docId);
        
        await updateDoc(docRef, {
            status: newStatus, // Change status to 'Available' or 'Rejected'
            approvedBy: currentUser.uid // Record the admin's ID
        });

        alert(`Listing marked as ${newStatus}!`);
        
        // Remove from UI immediately
        document.getElementById("animalModal").classList.remove("open");
        loadPendingListings(); // Refresh list

    } catch (error) {
        console.error("Error updating status:", error);
        alert("Error: " + error.message);
    }
};

// --- MODAL LOGIC ---
window.openAdminModal = function(id) {
    const data = pendingListings.find(a => a.id === id);
    if (!data) return;

    // Fill Modal
    document.getElementById('modalTitle').innerText = "Review: " + data.name;
    document.getElementById('modalName').innerText = data.name;
    document.getElementById('modalImg').src = data.imageUrl;
    document.getElementById('modalBreed').innerText = data.breed || data.type;
    document.getElementById('modalLoc').innerText = data.location;
    document.getElementById('modalAboutTitle').innerText = "About " + data.name;
    document.getElementById('modalFullDesc').innerText = data.description;

    // Setup Buttons inside Modal
    const approveBtn = document.getElementById('modalApproveBtn');
    const rejectBtn = document.getElementById('modalRejectBtn');

    // Clone to remove old listeners
    const newApprove = approveBtn.cloneNode(true);
    const newReject = rejectBtn.cloneNode(true);
    approveBtn.parentNode.replaceChild(newApprove, approveBtn);
    rejectBtn.parentNode.replaceChild(newReject, rejectBtn);

    newApprove.addEventListener('click', () => updateListingStatus(id, 'Available'));
    newReject.addEventListener('click', () => updateListingStatus(id, 'Rejected'));

    document.getElementById("animalModal").classList.add("open");
};