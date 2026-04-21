// --- INITIAL GAME STATE ---
let gameState = {
    energy: 100,
    scrap: 0,
    planets: [],
    scanCost: 10, // Starting cost
    maxPlanets: 3, // Starting limit
    lastTick: Date.now()
};

// --- CONFIGURATION ---
const PLANET_TYPES = ["Volcanic", "Frozen", "Gaseous", "Metallic", "Desert"];
const PREFIXES = ["Nova", "Sector", "Exo", "Prime", "Void"];

// --- CORE FUNCTIONS ---

/**
 * Consumes energy to find a new planet. 
 * Cost increases each time a scan is successful.
 */
function manualScan() {
    if (gameState.planets.length >= gameState.maxPlanets) {
        alert("COMMAND_CAPACITY_REACHED: Upgrade Command Center to manage more colonies.");
        return;
    }

    if (gameState.energy >= gameState.scanCost) {
        gameState.energy -= gameState.scanCost;
        
        discoverPlanet();
        
        // Increase the cost for the next scan (Exponential scaling)
        gameState.scanCost = Math.floor(gameState.scanCost * 1.5);
        
        updateUI();
    } else {
        console.log("INSUFFICIENT_ENERGY");
    }
}

/**
 * Upgrades the global command capacity to allow more planets.
 */
function upgradeCommand() {
    const cost = Math.pow(gameState.maxPlanets, 2) * 20; // 180, 320, 500...
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.maxPlanets++;
        updateUI();
    } else {
        alert(`NEED ${cost} SCRAP TO EXPAND COMMAND.`);
    }
}

/**
 * Generates a new planet with unique multipliers.
 */
function discoverPlanet() {
    const id = Math.random().toString(36).substr(2, 9);
    const type = PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
    const newPlanet = {
        id: id,
        name: name,
        type: type,
        scrapPerTick: Math.random() * 0.4,
        energyPerTick: Math.random() * 0.1,
        modules: {
            extractor: 0,
            solarArray: 0
        }
    };

    gameState.planets.push(newPlanet);
    renderPlanets();
}

function buildModule(planetId, moduleType) {
    const planet = gameState.planets.find(p => p.id === planetId);
    const cost = 10 + (planet.modules[moduleType] * 5); 

    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        planet.modules[moduleType]++;
        
        if (moduleType === 'extractor') planet.scrapPerTick += 0.20;
        if (moduleType === 'solarArray') planet.energyPerTick += 0.35;
        
        renderPlanets();
        updateUI();
    }
}

function renamePlanet(planetId) {
    const planet = gameState.planets.find(p => p.id === planetId);
    const newName = prompt("ENTER_NEW_DESIGNATION:", planet.name);
    if (newName) {
        planet.name = newName.toUpperCase();
        renderPlanets();
    }
}

// --- ENGINE LOOP ---

function gameLoop() {
    gameState.planets.forEach(planet => {
        gameState.scrap += (planet.scrapPerTick / 10);
        gameState.energy += (planet.energyPerTick / 10);
    });

    // Slowed down base regen to make planet production more vital
    gameState.energy += 0.02;

    updateUI();
}

// --- UI RENDERING ---

function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('planet-count').innerText = `${gameState.planets.length} / ${gameState.maxPlanets}`;
    
    // Update the scan button text to show the current cost
    const scanBtn = document.querySelector('button[onclick="manualScan()"]');
    if(scanBtn) scanBtn.innerText = `[ EXECUTE_SCAN ] (Cost: ${gameState.scanCost} Energy)`;
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

setInterval(gameLoop, 100);
