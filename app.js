// --- INITIAL GAME STATE ---
let gameState = {
    energy: 100,
    scrap: 0,
    planets: [],
    lastTick: Date.now()
};

// --- CONFIGURATION ---
const PLANET_TYPES = ["Volcanic", "Frozen", "Gaseous", "Metallic", "Desert"];
const PREFIXES = ["Nova", "Sector", "Exo", "Prime", "Void"];

// --- CORE FUNCTIONS ---

function manualScan() {
    if (gameState.energy >= 10) {
        gameState.energy -= 10;
        discoverPlanet();
        updateUI();
    } else {
        console.log("INSUFFICIENT_ENERGY");
    }
}

function discoverPlanet() {
    const id = Math.random().toString(36).substr(2, 9);
    const type = PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
    // Each planet has random resource multipliers
    const newPlanet = {
        id: id,
        name: name,
        type: type,
        scrapPerTick: Math.random() * 0.5,
        energyPerTick: Math.random() * 1.2,
        level: 1
    };

    gameState.planets.push(newPlanet);
    renderPlanets();
}

// --- ENGINE LOOP ---

function gameLoop() {
    // Generate resources from all discovered planets
    gameState.planets.forEach(planet => {
        gameState.scrap += planet.scrapPerTick;
        gameState.energy += planet.energyPerTick;
    });

    // Passive base energy regen
    gameState.energy += 0.1;

    updateUI();
}

// --- UI RENDERING ---

function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('planet-count').innerText = gameState.planets.length;
}

function renderPlanets() {
    const list = document.getElementById('planet-list');
    list.innerHTML = ''; // Clear current list

    gameState.planets.forEach(planet => {
        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `
            <strong>ID: ${planet.name}</strong> [Type: ${planet.type}]<br>
            + Output: ${planet.scrapPerTick.toFixed(2)} Scrap/s<br>
            + Generation: ${planet.energyPerTick.toFixed(2)} Energy/s
        `;
        list.appendChild(card);
    });
}

// Start the loop (runs 10 times per second for smoothness)
setInterval(gameLoop, 100);
