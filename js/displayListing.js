// js/displayListing.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

// 1. Wait for Auth
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadAnimals(); 
});

async function loadAnimals() {
    const grid = document.getElementById("listingGrid");
    grid.innerHTML = '<p style="text-align:center; width:100%;">Loading animals...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "animals"));
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No animals found.</p>';
            return;
        }

        allListings = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            
            // --- DATE FORMATTING LOGIC ---
            if (data.createdAt && data.createdAt.seconds) {
                // Convert Firestore Timestamp to JS Date
                const dateObj = new Date(data.createdAt.seconds * 1000);
                // Format: "15 Dec 2025"
                data.formattedDate = dateObj.toLocaleDateString("en-GB", {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            } else {
                data.formattedDate = "Date Unknown";
            }

            allListings.push(data);
        });

        // 2. Filter & Render
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

    if (dataList.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No matching animals found.</p>';
        return;
    }

    dataList.forEach((animal) => {
        
        // --- VISIBILITY RULES ---
        const isOwner = currentUser && (currentUser.uid === animal.createdBy);
        const isApproved = animal.status === "Approved";

        // Show card ONLY if: It is Approved OR Current User is the Creator
        if (!isApproved && !isOwner) {
            return; 
        }

        // Badge Logic
        let badgeClass = "status-approved"; 
        let statusText = animal.status || "Available"; 
        
        if (animal.status === "Pending") {
            badgeClass = "status-pending"; 
        }

        // Breed Text
        const breedDisplay = animal.breed ? `${animal.type} • ${animal.breed}` : animal.type;

        const cardHTML = `
            <div class="listing-card" onclick="openModalById('${animal.id}')">
                <div class="listing-card-img-container">
                    <img src="${animal.imageUrl}" alt="${animal.name}" class="listing-card-img">
                    <div class="listing-card-status">
                        <p class="${badgeClass}">${statusText}</p>
                    </div>
                </div>
                <div class="listing-card-info-section">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom: 5px;">
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
                        <span>${animal.vaccinationStatus}</span>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

function setupFilters() {
    const searchInput = document.getElementById("filterSearch");
    const ageInput = document.getElementById("filterAge");
    const typeInput = document.getElementById("filterType");
    const genderInput = document.getElementById("filterGender");

    searchInput.addEventListener("input", filterAndRender);
    ageInput.addEventListener("input", filterAndRender);
    typeInput.addEventListener("change", filterAndRender);
    genderInput.addEventListener("change", filterAndRender);
}

function filterAndRender() {
    const searchText = document.getElementById("filterSearch").value.toLowerCase();
    const ageVal = document.getElementById("filterAge").value;
    const typeVal = document.getElementById("filterType").value;
    const genderVal = document.getElementById("filterGender").value;

    const filteredData = allListings.filter(animal => {
        // 1. Search
        const nameMatch = animal.name.toLowerCase().includes(searchText);
        const breedMatch = (animal.breed || "").toLowerCase().includes(searchText);
        const searchPass = nameMatch || breedMatch;

        // 2. Age
        let agePass = true;
        if (ageVal !== "") agePass = parseInt(animal.age) == parseInt(ageVal);

        // 3. Type (Includes "Other" Logic)
        let typePass = true;
        const standardTypes = ["Dog", "Cat", "Bird", "Rabbit"]; 
        if (typeVal === "Other") {
            typePass = !standardTypes.includes(animal.type);
        } else if (typeVal !== "All") {
            typePass = animal.type === typeVal;
        }

        // 4. Gender
        let genderPass = true;
        if (genderVal !== "All") genderPass = animal.gender === genderVal;

        return searchPass && agePass && typePass && genderPass;
    });

    renderGrid(filteredData);
}

// Modal Helper
window.openModalById = function(id) {
    const data = allListings.find(a => a.id === id);
    if (!data) return;

    const breedText = data.breed ? `${data.type} • ${data.breed}` : data.type;

    showAnimalDetails(
        data.name, 
        data.imageUrl, 
        breedText,           
        data.location, 
        data.vaccinationStatus,
        data.description || "No description provided." 
    );
};