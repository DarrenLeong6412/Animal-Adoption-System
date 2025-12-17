    //console.log("requests.js connected");
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
    import {
        runTransaction,
        updateDoc,
        query,
        where,
        getFirestore,
        getDocs,
        collection,
        doc,
        getDoc,
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

    const container = document.querySelector(".request-flex-container");
    const categoryButtons = document.querySelectorAll('input[name="approval-category-button"]');
    let currentCategory = "animalListings";
    categoryButtons.forEach(input => {
        input.addEventListener("change", () => {
            currentCategory = input.id; // use the input's id
            renderCategory(currentCategory);
        });
    });

    let isLoading = true;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadListings();
            await loadRequests(); // only load requests for this user
        }
        else {
            console.log("No user logged in");
            alert("You must be logged in to view your adoption requests.");
            window.location.href = "login.html";
            return;
        }
    });

    async function handleRequestDecision(requestId, animalId, decision) {
        try {
            console.log("=== handleRequestDecision ===");

            await runTransaction(db, async (transaction) => {
                const requestRef = doc(db, "requests", requestId);

                if (decision === "approved") {
                    // Force server-side snapshot
                    const q = query(
                        collection(db, "requests"),
                        where("listing_ID", "==", String(animalId)),
                        where("status", "==", "pending")
                    );
                    const snapshot = await getDocs(q, { source: "server" }); // ok to read server snapshot here

                    console.log("Snapshot docs returned:", snapshot.docs.length);
                    snapshot.docs.forEach(docSnap => {
                        console.log(
                            "Doc ID:", docSnap.id,
                            "listing_ID:", docSnap.data().listing_ID,
                            "status:", docSnap.data().status
                        );
                    });

                    // update all requests atomically within the transaction
                    for (const docSnap of snapshot.docs) {
                        const ref = doc(db, "requests", docSnap.id);
                        transaction.update(ref, {
                            status: docSnap.id === requestId ? "approved" : "rejected"
                        });
                        console.log(
                            docSnap.id === requestId
                                ? `Request ${docSnap.id} approved`
                                : `Request ${docSnap.id} rejected`
                        );
                    }
                } else {
                    // reject only current request
                    transaction.update(requestRef, { status: "rejected" });
                    console.log(`Request ${requestId} rejected`);
                }
            });

            alert(
                decision === "approved"
                    ? "Request approved successfully."
                    : "Request rejected."
            );

            await loadRequests();
            renderCategory(currentCategory);

        } catch (error) {
            console.error("Error handling decision:", error);
            alert("Something went wrong. Please try again.");
        }
    }

    let unapprovedRequests = []; //create request empty array for current user requests
    let allRequests = []; //empty array for all requests
    //console.log("firebase configs passed");

    // use async function to wait for the data to be retrieved first, then come back to finish processing and get the result
    async function loadRequests() {
        // 1. Fetch all requests
        const requestSnap = await getDocs(collection(db, "requests"));

        if (requestSnap.empty) {
            console.log("no requests found");
            requests = [];
            userRequests = [];
            isLoading = false;
            renderRequests([]);
            return;
        }

        // 2. Read raw request data
        // converts the docsnap data into ui friendly format
        // without this have to do req.data().attribute everytime
        let rawRequests = requestSnap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        // 3. Collect unique animal listing IDs
        // creates an array of animal listings needed to fetch
        // using set ensures no duplicate listing ID
        const listingIds = [...new Set(
            rawRequests
                .map(r => r.listing_ID)
                .filter(Boolean) // safety: remove undefined/null
        )];

        // 4. Collect unique user IDs
        const userIds = [...new Set(
            rawRequests
                .map(r => r.user_ID)
                .filter(Boolean) // safety: remove undefined/null
        )];
        // 5. Fetch related animals
        const animalMap = {};
        await Promise.all(
            listingIds.map(async (animalId) => {
                const animalSnap = await getDoc(doc(db, "animals", animalId));
                if (animalSnap.exists()) {
                    animalMap[animalId] = animalSnap.data();
                }
            })
        );

        // 6. Fetch related users
        const userMap = {};
        await Promise.all(
            userIds.map(async (userId) => {
                const userSnap = await getDoc(doc(db, "users", userId));
                if (userSnap.exists()) {
                    userMap[userId] = userSnap.data();
                }
            })
        );

        // 7. Merge request + animal (IMPORTANT: no const here)
        allRequests = rawRequests.map(r => {
            const animal = animalMap[r.listing_ID] || {};
            const user = userMap[r.user_ID] || {};

            // Date formatting
            let formattedDate;
            if (r.dateApplied && r.dateApplied.toDate) {
                const dateObj = r.dateApplied.toDate();
                formattedDate = dateObj.toLocaleDateString("en-GB", {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            } else {
                formattedDate = "Date Unknown";
            }

            return {
                id: r.id,

                // request info
                status: r.status ?? "unknown",
                reason: r.reason ?? "—",
                dateApplied: formattedDate,
                environmentDesc: r.environmentDesc ?? "—",
                environmentPhoto: r.environmentPhoto ?? "images/no-image.png",

                // animal info
                animalId: r.listing_ID ?? "noID",
                animalName: animal.name ?? "Unknown",
                type: animal.type ?? "—",
                breed: animal.breed ?? "—",
                imageUrl: animal.imageUrl ?? "images/no-image.png",
                location: animal.location ?? "—",
                vaccinationStatus: animal.vaccinationStatus ?? "-",

                // user info
                username: user.username ?? "—",
                identification_Number: user.identification_Number ?? "—",
                phone_Number: user.phone_Number ?? "—",
                email: user.email ?? "—"
            };
        });

        unapprovedRequests = allRequests.filter(r => r.status === "pending");
        // 6. Render once, after data is ready
        isLoading = false;
    }

    window.openModal = openModal;
    window.closeModal = closeModal;

    // ---------- RENDER CARDS ----------
    function renderRequests(list) {
        console.log("renderRequests called")
        container.innerHTML = "";

        if (isLoading) {
            container.innerHTML += `
        <div class="request-content">
            <p>Loading requests...</p>
        </div>
        `;
            return;
        }

        if (list.length === 0) {
            container.innerHTML += `
        <div class="request-content">
            <p>No adoption requests at the moment.</p>
        </div>
        `;
            return;
        }

        list.forEach(req => {
            // Add the status class dynamically
            const statusClass = `status-${req.status.toLowerCase().replace(/\s/g, '-')}`;
            container.innerHTML += `
    <a class="request-card-view-details" data-id="${req.id}" style="cursor:pointer;">
    <div class="listing-card">

        <div class="listing-card-img-container">
        <img
            src="${req.imageUrl}"
            alt="${req.animalName}"
            class="listing-card-img"
        />

        <div class="listing-card-status">
            <p class="${statusClass}">
            ${capitalizeStatus(req.status)}
            </p>
        </div>
        </div>

        <div class="listing-card-info-section">

        <!-- Header row -->
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
            <p class="listing-card-animal-name" style="margin:0;">
            ${req.animalName}
            </p>
            <span style="font-size:11px; color:#888; font-weight:500;">
            ${req.dateSubmitted ?? ""}
            </span>
        </div>

        <!-- Submitted by -->
        <div class="listing-card-details-row">
            <i class="fas fa-user"></i>
            <span>${req.username}</span>
        </div>

        <!-- Phone -->
        <div class="listing-card-details-row">
            <i class="fas fa-phone-alt"></i>
            <span>${req.phone_Number}</span>
        </div>

        <!-- Email -->
        <div class="listing-card-details-row">
            <i class="fas fa-envelope"></i>
            <span>${req.email}</span>
        </div>

        <!-- Identification -->
        <div class="listing-card-details-row">
            <i class="fas fa-id-card"></i>
            <span>${req.identification_Number}</span>
        </div>

        </div>
    </div>
    </a>
    `;

            console.log("Displayed card for request_ID: " + req.id);
        });

        container.querySelectorAll(".request-card-view-details").forEach(el => {
            el.addEventListener("click", () => openModal(el.dataset.id));
        });
    }

    // ---------- OPEN MODAL ----------
    function openModal(id) {
        const modal = document.getElementById("modal");
        modal.classList.add("open");
        showModalContent(id); // populate content
        console.log("open modal for requestID: " + id);
    }

    // ---------- CLOSE MODAL ----------
    function closeModal() {
        const modal = document.getElementById("modal");
        modal.classList.remove("open");
        //console.log("closeModal");
    }

    // ---------- MODAL CONTENT ----------
    function showModalContent(id) {

        // Convert req.id to string to match dataset
        id = String(id);

        const req = unapprovedRequests.find(r => String(r.id) === id);
        if (!req) {
            console.warn("Request not found for id:", id);
            return;
        }

        const modal = document.getElementById("modal");
        const modalTitle = modal.querySelector(".modal-inner-top-title h1");
        const modalImage = modal.querySelector(".modal-inner-image-container img");
        const modalInfoContainer = modal.querySelector(".modal-inner-info-container");

        modalTitle.innerText = req.animalName;
        modalImage.src = req.imageUrl;
        modalImage.alt = req.name;

        document.getElementById("modalActions").addEventListener("click", (e) => {
            if (e.target.dataset.action === "approve") {
                handleRequestDecision(id, req.animalId, "approved");
                closeModal();
            }

            if (e.target.dataset.action === "reject") {
                handleRequestDecision(id, req.animalId, "rejected");
                closeModal();
            }
        });

        modalInfoContainer.innerHTML = `
        <div class="modal-inner-top-title>
            <h1>${req.animalName}</h1>
        </div>

        <div class="modal-inner-info-text">
            <h3 id="modalName">${req.animalName}</h2>
        </div>

        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-paw"></i>
            <p class="modal-inner-info-text-title">Type</p>
            <span>${req.type} • ${req.breed}</span>
        </div>

        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-map-marker-alt"></i>
            <p class="modal-inner-info-text-title">Location</p>
            <span>${req.location}</span>
        </div>

        <div class="lmodal-inner-info-text modal-detail-item">
            <i class="fas fa-syringe"></i>
            <p class="modal-inner-info-text-title">Vaccination</p>
            <span>${req.vaccinationStatus}</span>
        </div>

        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-calendar-alt"></i>
            <p class="modal-inner-info-text-title">Date Applied</p>
            <span>${req.dateApplied}</span>
        </div>

        <!-- USER INFO -->
        <div class="modal-inner-info-text">
            <h3 id="modalName">Applicant Details</h2>
        </div>

        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-user"></i>
            <p class="modal-inner-info-text-title">Submitted By</p>
            <span>${req.username}</span>
        </div>

        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-id-card"></i>
            <p class="modal-inner-info-text-title">Identification Number</p>
            <span>${req.identification_Number}</span>
        </div>

        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-phone"></i>
            <p class="modal-inner-info-text-title">Phone Number</p>
            <span>${req.phone_Number}</span>
        </div>

        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-envelope"></i>
            <p class="modal-inner-info-text-title">Email</p>
            <span>${req.email}</span>
        </div>

        <!-- STATUS -->
        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-info-circle"></i>
            <p class="modal-inner-info-text-title">Status</p>
            <span>${capitalizeStatus(req.status)}</span>
        </div>

        <!-- REASON -->
        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-question-circle"></i>
            <p class="modal-inner-info-text-title">
            Why do you want to adopt ${req.animalName}?
            </p>
        </div>
        <div class="modal-inner-info-text modal-detail-item">
            <span>${req.reason}</span>
        </div>

        <!-- ENVIRONMENT DESCRIPTION -->
        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-home"></i>
            <p class="modal-inner-info-text-title">Home Environment Description</p>
        </div>
        
        <div class="modal-inner-info-text modal-detail-item">
            <span>${req.environmentDesc}</span>
        </div>

        <!-- ENVIRONMENT PHOTO -->
        <div class="modal-inner-info-text modal-detail-item">
            <i class="fas fa-image"></i>
            <p class="modal-inner-info-text-title">Home Environment Photo</p>
        </div>
        <img src="${req.environmentPhoto}" alt="Home Environment" class="modal-environment-photo"/ >
        
        
    `;
    }

    // --- ZHILIN ADD HERE ---

    let pendingListings = []; 

    // 1. Fetch Pending Listings
    async function loadListings() {
        container.innerHTML = '<div class="request-content"><p>Loading pending listings...</p></div>';
        
        try {
            const querySnapshot = await getDocs(collection(db, "animals"));
            pendingListings = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.status === "Pending") { 
                    pendingListings.push({ id: docSnap.id, ...data });
                }
            });

            
            pendingListings.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

            renderListings(pendingListings);

        } catch (error) {
            console.error("Error loading listings:", error);
            container.innerHTML = '<div class="request-content"><p style="color:red">Error loading data.</p></div>';
        }
    }

    // 2. Render Cards 
    function renderListings(list) {
        container.innerHTML = "";

        if (list.length === 0) {
            container.innerHTML = `<div class="request-content"><p>No pending animal listings.</p></div>`;
            return;
        }

        list.forEach(animal => {

            const imgUrl = animal.imageUrl || 'images/no-image.png';
            const breedInfo = animal.breed || '-';
            const typeInfo = animal.type || '-';
            const ageInfo = animal.age ? `${animal.age} months old` : 'Age N/A';
            const submitter = animal.ownerEmail || 'Unknown';
            
            
            let createdDate = "Date Unknown";
            if (animal.createdAt && animal.createdAt.seconds) {
                createdDate = new Date(animal.createdAt.seconds * 1000).toLocaleDateString("en-GB");
            }

            container.innerHTML += `
            <div class="request-card">
                <div class="request-card-img-container">
                    <img class="request-card-img" src="${imgUrl}" alt="${animal.name}">
                </div>

                <div class="request-card-info-section">
                    <div class="request-card-info">
                        <p class="request-card-animal-name">${animal.name}</p>

                        <p>Submitted By: ${submitter}</p>
                        <p>Type: ${typeInfo}</p>
                        <p>Breed: ${breedInfo}</p>
                        <p>Age: ${ageInfo}</p>
                        <p>Date: ${createdDate}</p>

                        <p class="view-details-link" onclick="openListingModal('${animal.id}')">
                            View Details
                        </p>
                    </div>

                    <div class="request-card-status">
                        <p class="status-pending">
                            Pending
                        </p>
                    </div>
                </div>
            </div>`;
        });
    }

    // 3. Modal Logic 
    window.openListingModal = function(id) {
        const animal = pendingListings.find(a => a.id === id);
        if (!animal) return;

        const modal = document.getElementById("modal");
        const modalImg = modal.querySelector(".modalImg"); 
        const infoContainer = modal.querySelector(".modal-inner-info-container");
        const titleElement = modal.querySelector(".modal-inner-top-title h1");

        if (titleElement) titleElement.innerText = animal.name;
        if (modalImg) modalImg.src = animal.imageUrl || 'images/no-image.png';

        let fullDate = "Unknown";
        if (animal.createdAt && animal.createdAt.seconds) {
            fullDate = new Date(animal.createdAt.seconds * 1000).toLocaleDateString("en-GB");
        }

        infoContainer.innerHTML = `
            <h2 style="color: #164A41; margin-bottom: 15px;">${animal.name}</h2>
            
            <div class="modal-detail-item">
                <i class="fas fa-paw"></i>
                <div>
                    <p class="modal-inner-info-text-title">Type</p>
                    <span>${animal.type} • ${animal.breed}</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="fas fa-birthday-cake"></i>
                <div>
                    <p class="modal-inner-info-text-title">Age</p>
                    <span>${animal.age || 'N/A'} months old</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <p class="modal-inner-info-text-title">Location</p>
                    <span>${animal.location || 'No location provided'}</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="fas fa-syringe"></i>
                <div>
                    <p class="modal-inner-info-text-title">Vaccination Status</p>
                    <span>${animal.vaccinationStatus || 'Not Specified'}</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="fas fa-user"></i>
                <div>
                    <p class="modal-inner-info-text-title">Submitted By</p>
                    <span>${animal.ownerEmail || 'Unknown'}</span>
                </div>
            </div>

            <div class="modal-detail-item">
                <i class="far fa-calendar-alt"></i>
                <div>
                    <p class="modal-inner-info-text-title">Created On</p>
                    <span>${fullDate}</span>
                </div>
            </div>

            <div class="modal-detail-item" style="align-items:flex-start;">
                <i class="fas fa-align-left" style="margin-top:5px;"></i>
                <div>
                    <p class="modal-inner-info-text-title">Description</p>
                    <p style="margin-top: 5px; color: #555; line-height: 1.5;">${animal.description || 'No description provided.'}</p>
                </div>
            </div>

            <div class="modal-actions">
                <button class="modal-btn btn-approve-listing" onclick="updateListingStatus('${animal.id}', 'Available'); closeModal()">
                    Approve Listing
                </button>
                <button class="modal-btn btn-reject-listing" onclick="updateListingStatus('${animal.id}', 'Rejected'); closeModal()">
                    Reject Listing
                </button>
            </div>
        `;

        modal.classList.add("open");
    };

    // 4. Update Status
    window.updateListingStatus = async function(docId, newStatus) {
        if (!confirm(`Are you sure you want to mark this listing as ${newStatus}?`)) return;

        try {
            const animalRef = doc(db, "animals", docId);
            await updateDoc(animalRef, { status: newStatus });
            alert("Success! Listing marked as " + newStatus);
            
            const modal = document.getElementById("modal");
            if(modal.classList.contains("open")) closeModal();
            
            loadListings();
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status.");
        }
    };




    // ---------- HELPER ----------
    function capitalizeStatus(status) {
        return status
            .split(" ")
            .map(w => w[0].toUpperCase() + w.slice(1))
            .join(" ");
    }
    const searchInput = document.getElementById("searchInput"); // make sure your HTML has this

    // ---------- CATEGORY SELECTION ----------
    function renderCategory(category) {
        container.innerHTML = ""; // clear previous content

        switch (category) {
            case "animalListings":
                loadListings();
                break;
            case "adoptionRequests":
                renderRequests(unapprovedRequests); // your function
                break;
            case "lostPetReports":
                //renderLostPetReports();
                break;
            default:
                console.log("no category selected");
        }
    }


    document.querySelectorAll(".request-card-status p").forEach(p => {
        const status = p.innerText.toLowerCase().replace(/\s/g, "-"); // e.g., 'under review' → 'under-review'
        p.classList.add(`status-${status}`);
    });