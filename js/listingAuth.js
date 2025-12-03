// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

// Authentication Imports
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Database Imports (Firestore)
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCy5YAmmb1aTnWiXljQr3yOVsTKmYPAS08",
  authDomain: "pet-adoption-system-cf9f7.firebaseapp.com",
  projectId: "pet-adoption-system-cf9f7",
  storageBucket: "pet-adoption-system-cf9f7.firebasestorage.app",
  messagingSenderId: "615748560994",
  appId: "1:615748560994:web:465de9b90ac9208ec1493b",
  measurementId: "G-RZQDCB3V2C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Database

// ============================================
// 1. AUTH STATE LISTENER (Check if user is logged in)
// ============================================
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("User is logged in:", user.email);
    // Optional: Hide login button / Show logout button logic here
  } else {
    currentUser = null;
    console.log("No user logged in");
    // If we are on the Add Listing page, force redirect to login
    if (window.location.pathname.includes("add-listing.html")) {
        alert("You must be logged in to add a listing.");
        window.location.href = "login.html";
    }
  }
});

// ============================================
// 2. SIGN UP HANDLER
// ============================================
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert("Account created successfully!");
        window.location.href = "login.html";
      })
      .catch((error) => {
        alert("Error: " + error.message);
      });
  });
}

// ============================================
// 3. LOGIN HANDLER
// ============================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert("Login successful!");
        window.location.href = "index.html";
      })
      .catch((error) => {
        alert("Error: " + error.message);
      });
  });
}

// ============================================
// 4. ADD LISTING LOGIC (Requires Auth)
// ============================================
const addForm = document.getElementById('addAnimalForm');

if (addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page refresh

        // Security Check: Is user logged in?
        if (!currentUser) {
            alert("You must be logged in to submit a listing!");
            window.location.href = "login.html";
            return;
        }

        // Get values from input fields
        const animalData = {
            name: document.getElementById('name').value,
            type: document.getElementById('type').value,
            breed: document.getElementById('breed').value,
            gender: document.getElementById('gender').value,
            age: document.getElementById('age').value,
            vaccination: document.getElementById('vaccine').value,
            location: document.getElementById('location').value,
            photoUrl: document.getElementById('photo').value,
            description: document.getElementById('desc').value,
            status: "Approved", 
            dateListed: new Date().toISOString(),
            
            // IMPORTANT: Save WHO created this listing
            userId: currentUser.uid, 
            userEmail: currentUser.email
        };

        try {
            // Save to 'animals' collection in Firestore
            await addDoc(collection(db, "animals"), animalData);
            alert("Animal Listed Successfully!");
            window.location.href = "index.html"; 
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error saving data: " + error.message);
        }
    });
}

// ============================================
// 5. DISPLAY LISTINGS (Public View)
// ============================================
const container = document.getElementById('listings-container');

async function loadAnimals() {
    if (!container) return; // Only run on main page

    container.innerHTML = "Loading animals..."; 

    try {
        const querySnapshot = await getDocs(collection(db, "animals"));
        container.innerHTML = ""; // Clear loading text
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;

            // HTML Card
            const cardHTML = `
                <div class="animal-card" onclick="openAnimalModal('${id}', '${data.name}', '${data.breed}', '${data.age}', '${data.gender}', '${data.location}', '${data.vaccination}', '${data.photoUrl}', '${data.description}')">
                    <div class="card-image">
                        <img src="${data.photoUrl}" alt="${data.name}" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                        <span class="badge">approved</span>
                    </div>
                    <div class="card-body">
                        <div class="animal-name">${data.name}</div>
                        <div style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">
                            ${data.breed} • ${data.age} years • ${data.gender}
                        </div>
                        <div class="info-row">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>${data.location}</span>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });
    } catch (error) {
        console.error("Error loading animals:", error);
        container.innerHTML = "Failed to load listings.";
    }
}

// Start loading
loadAnimals();

// Modal Functions (Attach to window so HTML can see them)
window.openAnimalModal = function(id, name, breed, age, gender, loc, vax, photo, desc) {
    document.getElementById('modal-img').src = photo;
    document.getElementById('modal-name').innerText = name;
    document.getElementById('modal-details').innerText = `${breed} • ${age} years • ${gender}`;
    document.getElementById('modal-location').innerText = loc;
    document.getElementById('modal-vaccine').innerText = vax;
    document.getElementById('modal-desc').innerText = desc;
    document.getElementById('animalModal').style.display = "flex";
}