// ---------- MOCK DATA ----------
const pets = [
  {
    id: 1,
    name: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    color: "Golden",
    lastSeenLocation: "Bukit Bintang, Kuala Lumpur",
    status: "approved",
    imageUrl:
      "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=1200",
  },
  {
    id: 2,
    name: "Mittens",
    species: "Cat",
    breed: "Tabby",
    color: "Grey/Orange",
    lastSeenLocation: "Jalan Sultan, Georgetown",
    status: "pending",
    imageUrl:
      "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=1200",
  },
  {
    id: 3,
    name: "Shadow",
    species: "Dog",
    breed: "Husky",
    color: "Black/White",
    lastSeenLocation: "Taman Melati, KL",
    status: "approved",
    imageUrl:
      "https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=1200",
  },
];

const grid = document.getElementById("petGrid");
const countText = document.getElementById("countText");
const searchInput = document.getElementById("searchInput");

// ---------- RENDER CARDS ----------
function renderPets(list) {
  grid.innerHTML = "";
  list.forEach((pet) => {
    grid.innerHTML += `
      <div class="card">
        <div style="position: relative;">
          <img src="${pet.imageUrl}" alt="${pet.name}">
          <span class="badge">${pet.status}</span>
        </div>
        <div class="content">
          <h3>${pet.name}</h3>
          <p>${pet.breed} • ${pet.species} • ${pet.color}</p>
          <p><strong>Last seen:</strong> ${pet.lastSeenLocation}</p>
        </div>
      </div>
    `;
  });

  countText.innerText = `Showing ${list.length} report${list.length !== 1 ? "s" : ""}`;
}

renderPets(pets);

// ---------- LIVE SEARCH ----------
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();

  const filtered = pets.filter((pet) =>
    [pet.name, pet.species, pet.breed, pet.color, pet.lastSeenLocation].some(
      (field) => field.toLowerCase().includes(q)
    )
  );

  renderPets(filtered);
});