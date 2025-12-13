// ---------- MOCK DATA ----------
const requests = [
  {
    id: 1,
    name: "Garfield",
    type: "Cat",
    breed: "Orange Cat",
    address: "191, Pesiaran Sungai Tepi",
    dateApplied: "6 December 2025",
    status: "pending",
    imageUrl: "images/3.jpeg",
    reason: "hello im at ur door again, i just needed a friend, but now i share a bed with you, am i down to succumb to the noise, im not a little boy no more, i've made my stupid choices too, tell my mother that im sorry, tell my father just the same, tell my sister that her brother, might as well have gone insane, is there space for me in you still, cause its spacious in LA, where the grass is always greener, and the world can scream my name, but you never really cared about, the way that everything turned out, you didn't wanna fall in love, you're looking out for yourself love, its starting to piss me off, i thought I had you figured out, never thought you would come and go this home belongs to someone else now, a place we called our home, has fallen to pieces on its own, I know that you're better off alone baby, could fix you but i wont"
  },
  {
    id: 2,
    name: "Buddy",
    type: "Dog",
    breed: "Golden Retriever",
    address: "Bukit Bintang, Kuala Lumpur",
    dateApplied: "5 December 2025",
    status: "approved",
    imageUrl: "images/1.jpeg",
    reason: "I like to eat dogs like the chinese from china."
  },
  {
    id: 3,
    name: "Mittens",
    type: "Cat",
    breed: "Grey Tabby",
    address: "Jalan Sultan, Georgetown",
    dateApplied: "4 December 2025",
    status: "rejected",
    imageUrl: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=1200",
    reason: "I want to be ninja, I want to be ninja, I want to chop chop chop chow down, bring chow down to chinatown."
  }
];

const container = document.querySelector(".request-flex-container");
const filterButtons = document.querySelectorAll('input[name="request-filter-button"]');

const modal = document.getElementById("modal");
const modalTitle = modal.querySelector(".modal-inner-top-title h1");
const modalImage = modal.querySelector(".modal-inner-image-container img");
const modalInfoContainer = modal.querySelector(".modal-inner-info-container");

// ---------- RENDER CARDS ----------
function renderRequests(list) {
  container.innerHTML = "";
  list.forEach(req => {
    // Add the status class dynamically
    const statusClass = `status-${req.status.toLowerCase().replace(/\s/g, '-')}`;

    container.innerHTML += `
      <div class="request-card">
        <div class="request-card-img-container">
          <img class="request-card-img" src="${req.imageUrl}" alt="${req.name}">
        </div>
        <div class="request-card-info-section">
          <div class="request-card-info">
            <p class="request-card-animal-name">${req.name}</p>
            <p>${req.breed}</p>
            <p>${req.address}</p>
            <p>Date Applied: ${req.dateApplied}</p>
            <a onclick="openModal(${req.id})"><p class="request-card-view-details">View Details</p></a>
          </div>
          <div class="request-card-status">
            <p class="${statusClass}">${capitalizeStatus(req.status)}</p>
          </div>
        </div>
      </div>
    `;
  });
}

// ---------- MODAL CONTENT ----------
function showModalContent(id) {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const modal = document.getElementById("modal");
    const modalTitle = modal.querySelector(".modal-inner-top-title h1");
    const modalImage = modal.querySelector(".modal-inner-image-container img");
    const modalInfoContainer = modal.querySelector(".modal-inner-info-container");

    modalTitle.innerText = req.name;
    modalImage.src = req.imageUrl;
    modalImage.alt = req.name;

    modalInfoContainer.innerHTML = `
        <div class="modal-inner-info-text">
            <p class="modal-inner-info-text-title">Animal Name</p>
            <p class="modal-inner-info-text-data">${req.name}</p>
        </div>
        <div class="modal-inner-info-text">
            <p class="modal-inner-info-text-title">Type</p>
            <p class="modal-inner-info-text-data">${req.type}</p>
        </div>

        <div class="modal-inner-info-text">
            <p class="modal-inner-info-text-title">Breed/Color</p>
            <p class="modal-inner-info-text-data">${req.breed}</p>
        </div>

        <div class="modal-inner-info-text">
            <p class="modal-inner-info-text-title">Address</p>
            <p class="modal-inner-info-text-data">${req.address}</p>
        </div>

        <div class="modal-inner-info-text">
            <p class="modal-inner-info-text-title">Date Applied</p>
            <p class="modal-inner-info-text-data">${req.dateApplied}</p>
        </div>

        <div class="modal-inner-info-text">
            <p class="modal-inner-info-text-title">Status</p>
            <p class="modal-inner-info-text-data">${capitalizeStatus(req.status)}</p>
        </div>

        <div class="modal-inner-info-text">
            <p class="modal-inner-info-text-title">Why do you want to adopt ${req.name}?</p>
            <p class="modal-inner-info-text-data">${req.reason}</p>
        </div>
    `;
}

// ---------- OPEN MODAL ----------
function openModal(id) {
    const modal = document.getElementById("modal");
    modal.classList.add("open");
    showModalContent(id); // populate content
}

// ---------- CLOSE MODAL ----------
function closeModal() {
    const modal = document.getElementById("modal");
    modal.classList.remove("open");
}


// ---------- HELPER ----------
function capitalizeStatus(status) {
  return status
    .split(" ")
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
const searchInput = document.getElementById("searchInput"); // make sure your HTML has this

// ---------- LIVE SEARCH ----------
searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();

    const filtered = requests.filter(req =>
        [req.name, req.type, req.breed, req.address, req.reason].some(
            field => field.toLowerCase().includes(q)
        )
    );

    renderRequests(filtered);
});

// ---------- FILTER ----------
filterButtons.forEach(btn => {
    btn.addEventListener("change", () => {
        const value = document.querySelector('input[name="request-filter-button"]:checked').id;
        if (value === "all") {
            renderRequests(requests);
        } else {
            renderRequests(requests.filter(r => r.status === value));
        }
    });
});


// INITIAL RENDER
renderRequests(requests);

document.querySelectorAll(".request-card-status p").forEach(p => {
    const status = p.innerText.toLowerCase().replace(/\s/g, "-"); // e.g., 'under review' → 'under-review'
    p.classList.add(`status-${status}`);
});