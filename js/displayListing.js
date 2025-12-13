// js/displayListings.js

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

// 1. Global list to store animal data for the Modal
window.allAnimals = {}; 

async function loadAnimals() {
    const grid = document.getElementById("listingGrid");
    
    // Clear the hardcoded "Max" and "Charlie"
    grid.innerHTML = '<p style="text-align:center; width:100%;">Loading animals...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "animals"));
        
        // If empty
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No animals found. Add one!</p>';
            return;
        }

        // Clear loading text
        grid.innerHTML = "";

        querySnapshot.forEach((doc) => {
            const animal = doc.data();
            const animalId = doc.id;
            
            // Store data for the modal popup later
            window.allAnimals[animalId] = animal;

            // Create the Card HTML
            // We use a specific onclick function: openModalById('ID')
            const cardHTML = `
                <div class="listing-card" onclick="openModalById('${animalId}')">
                    <div class="listing-card-img-container">
                        <img src="${animal.imageUrl}" alt="${animal.name}" class="listing-card-img">
                        <div class="listing-card-status"><p>${animal.status || 'Available'}</p></div>
                    </div>
                    <div class="listing-card-info-section">
                        <p class="listing-card-animal-name">${animal.name}</p>
                        <p>${animal.breed || animal.type} • ${animal.age} ${animal.ageUnit} • ${animal.gender}</p>
                        
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
            
            // Add to grid
            grid.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Error loading animals:", error);
        grid.innerHTML = '<p style="color:red;">Error loading data.</p>';
    }
}

// Run the function when page loads
loadAnimals();

// Expose the open function to the global window so HTML can see it
window.openModalById = function(id) {
    const data = window.allAnimals[id];
    if (!data) return;

    // Use your existing showAnimalDetails logic, but fed with real data
    // We construct the description string dynamically
    const descString = `${data.breed} • ${data.age} ${data.ageUnit}`;
    
    // Call the function you already have in your HTML script
    showAnimalDetails(
        data.name, 
        data.imageUrl, 
        data.description, // Passing full description here
        data.location, 
        data.vaccinationStatus
    );
};