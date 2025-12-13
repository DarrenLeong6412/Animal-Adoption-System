// js/displayListing.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
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
const db = getFirestore(app);

// Global store
let allListings = [];

async function loadAnimals() {
    const grid = document.getElementById("listingGrid");
    grid.innerHTML = '<p style="text-align:center; width:100%;">Loading animals...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "animals"));
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No animals found. Add one!</p>';
            return;
        }

        allListings = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id; 
            allListings.push(data);
        });

        renderGrid(allListings);
        setupFilters();

    } catch (error) {
        console.error("Error loading animals:", error);
        grid.innerHTML = '<p style="color:red;">Error loading data.</p>';
    }
}

function renderGrid(dataList) {
    const grid = document.getElementById("listingGrid");
    grid.innerHTML = ""; 

    if (dataList.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No animals match your filters.</p>';
        return;
    }

    dataList.forEach((animal) => {
        // Construct readable breed string
        const breedDisplay = animal.breed ? `${animal.type} • ${animal.breed}` : animal.type;

        const cardHTML = `
            <div class="listing-card" onclick="openModalById('${animal.id}')">
                <div class="listing-card-img-container">
                    <img src="${animal.imageUrl}" alt="${animal.name}" class="listing-card-img">
                    <div class="listing-card-status"><p>${animal.status || 'Available'}</p></div>
                </div>
                <div class="listing-card-info-section">
                    <p class="listing-card-animal-name">${animal.name}</p>
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
        const nameMatch = animal.name.toLowerCase().includes(searchText);
        const breedMatch = (animal.breed || "").toLowerCase().includes(searchText);
        const searchPass = nameMatch || breedMatch;

        let agePass = true;
        if (ageVal !== "") {
            agePass = parseInt(animal.age) == parseInt(ageVal);
        }

        let typePass = true;
        if (typeVal !== "All") {
            typePass = animal.type === typeVal;
        }

        let genderPass = true;
        if (genderVal !== "All") {
            genderPass = animal.gender === genderVal;
        }

        return searchPass && agePass && typePass && genderPass;
    });

    renderGrid(filteredData);
}

// Modal Helper
window.openModalById = function(id) {
    const data = allListings.find(a => a.id === id);
    if (!data) return;

    // Create text for the Paw Icon (e.g., "Dog • Golden Retriever")
    const breedText = data.breed ? `${data.type} • ${data.breed}` : data.type;

    // Pass data to listing.html function
    // 1. Name, 2. Image, 3. Breed(for Icon), 4. Location, 5. Vaccine, 6. Description(for Bottom)
    showAnimalDetails(
        data.name, 
        data.imageUrl, 
        breedText,           
        data.location, 
        data.vaccinationStatus,
        data.description || "No description provided." 
    );
};

loadAnimals();