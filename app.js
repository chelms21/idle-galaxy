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

/**
 * Consumes energy to find a new planet.
 */
function manualScan() {
    if (gameState.energy >= 10) {
        gameState.energy -= 10;
        discoverPlanet();
        updateUI();
    } else {
        console.log("INSUFFICIENT_ENERGY");
    }
}

/**
 * Generates a new planet with unique multipliers and empty module slots.
 */
function discoverPlanet() {
    const id = Math.random().toString(36).substr(2, 9);
    const type = PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
    const newPlanet = {
        id: id,
        name: name,
        type: type,
        scrapPerTick: Math.random() * 0.5,
        energyPerTick: Math.random() * 0.2,
        modules: {
            extractor: 0,
            solarArray: 0
        }
    };

    gameState.planets.push(newPlanet);
    renderPlanets();
}

/**
 * Purchases a building for a specific planet.
 * Cost scales based on how many modules are already present.
 */
function buildModule(planetId, moduleType) {
    const planet = gameState.planets.find(p => p.id === planetId);
    // Base cost is 10, increases by 5 for every existing module of that type
    const cost = 10 + (planet.modules[moduleType] * 5); 

    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        planet.modules[moduleType]++;
        
        // Update the planet's output based on the new building
        if (moduleType === 'extractor') planet.scrapPerTick += 0.25;
        if (moduleType === 'solarArray') planet.energyPerTick += 0.4;
        
        renderPlanets();
        updateUI();
    } else {
        console.log("INSUFFICIENT_RESOURCES");
    }
}

/**
 * Allows the user to rename a discovered planet (The NMS "Discovery" hook).
 */
function renamePlanet(planetId) {
    const planet = gameState.planets.find(p => p.id === planetId);
    const newName = prompt("ENTER_NEW_DESIGNATION:", planet.name);
    if (newName) {
        planet.name = newName.toUpperCase();
        renderPlanets();
    }
}

// --- ENGINE LOOP ---

/**
 * Main game loop running at 10Hz (100ms per tick).
 */
function gameLoop() {
    // Generate resources from all discovered planets
    gameState.planets.forEach(planet => {
        gameState.scrap += (planet.scrapPerTick / 10);
        gameState.energy += (planet.energyPerTick / 10);
    });

    // Passive base energy regeneration
    gameState.energy += 0.05;

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
    list.innerHTML = ''; 

    gameState.planets.forEach(planet => {
        const card = document.createElement('div');
        card.className = 'planet-card';
        
        const extractCost = 10 + (planet.modules.extractor * 5);
        const solarCost = 10 + (planet.modules.solarArray * 5);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>SYS//: ${planet.name}</strong>
                <button onclick="renamePlanet('${planet.id}')" style="padding: 2px 5px; font-size: 10px; margin-left: 10px;">[EDIT_NAME]</button>
                <span style="margin-left: auto;">[TYPE: ${planet.type.toUpperCase()}]</span>
            </div>
            <hr border="1" color="#333" style="margin: 8px 0;">
            <div style="font-size: 12px; color: #888;">
                RESOURCES: +${planet.scrapPerTick.toFixed(2)} scrap/s | +${planet.energyPerTick.toFixed(2)} nrg/s
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button onclick="buildModule('${planet.id}', 'extractor')">
                    EXTRACTOR (${extractCost} S) [Qty: ${planet.modules.extractor}]
                </button>
                <button onclick="buildModule('${planet.id}', 'solarArray')">
                    SOLAR_ARRAY (${solarCost} S) [Qty: ${planet.modules.solarArray}]
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

// Initialize Loop
setInterval(gameLoop, 100);
