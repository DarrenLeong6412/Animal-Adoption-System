// javascript/lostpet.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
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

let currentUser = null;
let isLoading = true;
let isAdmin = false;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    await checkAdminStatus(user.uid);
  }
  loadLostPets();
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

async function loadLostPets() {
  const grid = document.getElementById("lost-pet-grid");
  grid.innerHTML = '<p style="text-align:center; width:100%;">Loading Lost Pets...</p>';

  try {
    const q = query(collection(db, "lostPets"), orderBy("date_Reported", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      grid.innerHTML = '<p>No Lost petsright now.</p>';
      return;
    }

    allLostPets = [];
    querySnapshot.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;

      if (data.date_Reported && data.date_Reported.seconds) {
        const dateObj = new Date(data.date_Reported.seconds * 1000);
        data.formattedDate = dateObj.toLocaleDateString("en-GB", {
          day: 'numeric', month: 'short', year: 'numeric'
        });
      } else {
        data.formattedDate = "Date Unknown";
      }

      allLostPets.push(data);
    });

    filterAndRender();
    setupFilters();

  } catch (error) {
    console.error("Error:", error);
    grid.innerHTML = '<p style="color:red;">Error loading data.</p>';
  }
}

function renderGrid(dataList) {
    const grid = document.getElementById("lost-pet-grid");
    grid.innerHTML = ""; 

    const publicList = dataList.filter(lostPet => lostPet.status === "Lost");

    if (publicList.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">No Lost Pets found matching your criteria.</p>';
        return;
    }

    publicList.forEach((lostPet) => {
        let badgeStyle = "background-color: #ed2525ff; color: white;"; 
        let statusText = "Lost";
        const breedDisplay = lostPet.breed ? `${lostPet.type} • ${lostPet.breed}` : lostPet.type;

        let adminMenu = "";
        if (isAdmin) {
            adminMenu = `
                <div class="card-menu" onclick="event.stopPropagation()">
                    <div class="menu-icon" onclick="toggleMenu('${lostPet.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </div>
                    <div id="menu-${lostPet.id}" class="menu-dropdown">
                        <div onclick="editLostPet('${lostPet.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </div>
                        <div onclick="deleteLostPet('${lostPet.id}')" style="color: #dc2626;">
                            <i class="fas fa-trash"></i> Delete
                        </div>
                    </div>
                </div>
            `;
        }

        const cardHTML = `
            <div class="lostpet-card" onclick="openModalById('${lostPet.id}')" style="position: relative;">
                <div class="lostpet-card-img-container">
                    ${adminMenu}
                    <img src="${lostPet.imageUrl}" alt="${lostPet.name}" class="lostpet-card-img">
                    <div class="lostpet-card-status">
                        <p style="${badgeStyle}">${statusText}</p>
                    </div>
                </div>
                <div class="lostpet-card-info-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
                        <p class="lostpet-card-animal-name" style="margin:0;">${animal.name}</p>
                        <span style="font-size:11px; color:#888; font-weight:500;">${animal.formattedDate}</span>
                    </div>
                    //(here need to change afterwards the content wrong ald)
                    <p>${breedDisplay} • ${animal.age} Months • ${animal.gender}</p>
                    <div class="lostpet-card-details-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${animal.location}</span>
                    </div>
                    <div class="lostpet-card-details-row">
                        <i class="fas fa-syringe"></i>
                        <span>${animal.vaccinationStatus || 'Not specified'}</span>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

window.toggleMenu = function(id) {
    document.querySelectorAll('.menu-dropdown').forEach(el => {
        if (el.id !== `menu-${id}`) el.style.display = 'none';
    });
    const menu = document.getElementById(`menu-${id}`);
    if (menu) {
        menu.style.display = (menu.style.display === "block") ? "none" : "block";
    }
};


window.addEventListener('click', (e) => {
    // Close admin menu
    if (!e.target.closest('.card-menu')) {
        document.querySelectorAll('.menu-dropdown').forEach(el => el.style.display = 'none');
    }
    
    // Close Modal on outside click
    const modal = document.getElementById("animalModal");
    if (e.target == modal) {
        window.closeAnimalModal();
    }
});

// Modal Close Function (need change)
window.closePetModal = function() {
    document.getElementById("petModal").classList.remove("open");
};

