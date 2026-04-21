// --- INITIAL GAME STATE ---
let gameState = {
    energy: 100,
    scrap: 0,
    planets: [],
    scanCost: 10,
    maxPlanets: 3,
    lastTick: Date.now()
};

// --- CONFIGURATION ---
// Biome Traits: [Scrap Multiplier, Energy Multiplier]
const BIOMES = {
    "Volcanic": { scrap: 0.8, energy: 1.5, desc: "High Thermal Output / Dense Crust" },
    "Frozen":   { scrap: 0.7, energy: 0.5, desc: "Low Solar / Supercooled Circuits" },
    "Metallic": { scrap: 2.0, energy: 0.8, desc: "Rich Ores / High Gravity" },
    "Gaseous":  { scrap: 0.2, energy: 1.2, desc: "Atmospheric Fuel / No Solid Ground" },
    "Desert":   { scrap: 1.1, energy: 2.0, desc: "Clear Skies / Sand Interference" }
};

const PREFIXES = ["Nova", "Sector", "Exo", "Prime", "Void", "Krypton", "Zenith"];

// --- CORE FUNCTIONS ---

function manualScan() {
    if (gameState.planets.length >= gameState.maxPlanets) {
        alert("COMMAND_CAPACITY_REACHED: Upgrade Command Center.");
        return;
    }

    if (gameState.energy >= gameState.scanCost) {
        gameState.energy -= gameState.scanCost;
        discoverPlanet();
        gameState.scanCost = Math.floor(gameState.scanCost * 1.6);
        updateUI();
    } else {
        console.log("INSUFFICIENT_ENERGY");
    }
}

function upgradeCommand() {
    const cost = Math.pow(gameState.maxPlanets, 2) * 25; 
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.maxPlanets++;
        updateUI();
    } else {
        alert(`NEED ${cost} SCRAP TO EXPAND COMMAND.`);
    }
}

function discoverPlanet() {
    const id = Math.random().toString(36).substr(2, 9);
    const types = Object.keys(BIOMES);
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
    const newPlanet = {
        id: id,
        name: name,
        type: type,
        // Base rates modified by Biome traits
        scrapPerTick: 0.1 * BIOMES[type].scrap,
        energyPerTick: 0.05 * BIOMES[type].energy,
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
        
        // Modules are now heavily influenced by the Planet Type
        if (moduleType === 'extractor') {
            planet.scrapPerTick += (0.25 * BIOMES[planet.type].scrap);
        }
        if (moduleType === 'solarArray') {
            planet.energyPerTick += (0.4 * BIOMES[planet.type].energy);
        }
        
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

    gameState.energy += 0.02; // Base passive regen
    updateUI();
}

// --- UI RENDERING ---

function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('planet-count').innerText = `${gameState.planets.length} / ${gameState.maxPlanets}`;
    
    const scanBtn = document.querySelector('button[onclick="manualScan()"]');
    if(scanBtn) scanBtn.innerText = `[ EXECUTE_SCAN ] (Cost: ${gameState.scanCost} Energy)`;
}

function renderPlanets() {
    const list = document.getElementById('planet-list');
    list.innerHTML = ''; 

    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const card = document.createElement('div');
        card.className = 'planet-card';
        
        const extractCost = 10 + (planet.modules.extractor * 5);
        const solarCost = 10 + (planet.modules.solarArray * 5);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: #fff;">SYS//: ${planet.name}</strong>
                <button onclick="renamePlanet('${planet.id}')" style="padding: 2px 5px; font-size: 10px; margin-left: 10px;">[EDIT_NAME]</button>
                <span style="margin-left: auto; color: #00ff41;">[TYPE: ${planet.type.toUpperCase()}]</span>
            </div>
            <div style="font-size: 10px; color: #555; margin-bottom: 5px;">${biome.desc}</div>
            <hr border="1" color="#222" style="margin: 8px 0;">
            <div style="font-size: 12px; color: #888;">
                RESOURCES: +${planet.scrapPerTick.toFixed(2)} scrap/s | +${planet.energyPerTick.toFixed(2)} nrg/s
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button onclick="buildModule('${planet.id}', 'extractor')">
                    EXTRACTOR (${extractCost} S) <br> <small>Yield: x${biome.scrap}</small>
                </button>
                <button onclick="buildModule('${planet.id}', 'solarArray')">
                    SOLAR_ARRAY (${solarCost} S) <br> <small>Yield: x${biome.energy}</small>
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

setInterval(gameLoop, 100);
