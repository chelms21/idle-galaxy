// --- INITIAL GAME STATE ---
let gameState = {
    energy: 100,
    scrap: 20, 
    data: 0,
    colonists: 0, 
    maxColonists: 5, 
    freighters: 0, 
    activeRoutes: 0, 
    planets: [],
    scanCost: 10,
    maxPlanets: 3,
    upgrades: {
        cryoPipes: false,
        advancedDrills: 0,
        signalBoosters: 0
    },
    eventLog: [], // New: Store messages
    lastTick: Date.now()
};

// --- CONFIGURATION ---
const BIOMES = {
    "Volcanic": { scrap: 0.8, energy: 1.5, oxygenCost: 1.5, desc: "High Thermal Output / Dense Crust" },
    "Frozen":   { scrap: 0.7, energy: 0.5, oxygenCost: 1.0, desc: "Low Solar / Supercooled Circuits" },
    "Metallic": { scrap: 2.0, energy: 0.8, oxygenCost: 1.2, desc: "Rich Ores / Heavy Gravity" },
    "Gaseous":  { scrap: 0.2, energy: 1.2, oxygenCost: 2.0, desc: "Atmospheric Fuel / No Solid Ground" },
    "Desert":   { scrap: 1.1, energy: 2.0, oxygenCost: 0.8, desc: "Clear Skies / Sand Interference" }
};

const PREFIXES = ["Nova", "Sector", "Exo", "Prime", "Void", "Krypton", "Zenith"];

// --- CORE FUNCTIONS ---

function logMessage(msg) {
    gameState.eventLog.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (gameState.eventLog.length > 5) gameState.eventLog.pop();
    renderLog();
}

function manualScrap() {
    gameState.scrap += 1;
    updateUI();
}

function manualScan() {
    if (gameState.planets.length >= gameState.maxPlanets) {
        logMessage("ERROR: COMMAND_CAPACITY_LIMIT");
        return;
    }
    if (gameState.energy >= gameState.scanCost) {
        gameState.energy -= gameState.scanCost;
        discoverPlanet();
        let multiplier = 1.6 - (gameState.upgrades.signalBoosters * 0.05);
        gameState.scanCost = Math.floor(gameState.scanCost * Math.max(1.1, multiplier));
        logMessage("SUCCESS: NEW_PLANET_COORDINATES_LOCKED");
        updateUI();
    }
}

function recruitColonist() {
    const cost = 20 + (gameState.colonists * 10);
    if (gameState.scrap >= cost && gameState.colonists < gameState.maxColonists) {
        gameState.scrap -= cost;
        gameState.colonists++;
        logMessage("INFO: NEW_COLONIST_ARRIVED");
        updateUI();
    }
}

function buildFreighter() {
    const cost = 50 + (gameState.freighters * 25);
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.freighters++;
        logMessage("INFO: FREIGHTER_CONSTRUCTION_COMPLETE");
        updateUI();
    }
}

function upgradeCommand() {
    const cost = Math.pow(gameState.maxPlanets, 2) * 25; 
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.maxPlanets++;
        logMessage("UPGRADE: COMMAND_CENTER_EXPANDED");
        updateUI();
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
        assignedWorkers: 0,
        isExporting: false, 
        modules: { extractor: 0, solarArray: 0, lab: 0, hab: 0 }
    };

    gameState.planets.push(newPlanet);
    renderPlanets();
}

function toggleTrade(planetId) {
    const planet = gameState.planets.find(p => p.id === planetId);
    if (!planet.isExporting) {
        if (gameState.activeRoutes < gameState.freighters) {
            planet.isExporting = true;
            gameState.activeRoutes++;
        } else {
            logMessage("ALERT: NO_AVAILABLE_SHIPS");
        }
    } else {
        planet.isExporting = false;
        gameState.activeRoutes--;
    }
    renderPlanets();
    updateUI();
}

function buildModule(planetId, moduleType) {
    const planet = gameState.planets.find(p => p.id === planetId);
    let baseCost = (moduleType === 'lab') ? 50 : (moduleType === 'hab') ? 30 : 10;
    const cost = baseCost + (planet.modules[moduleType] * 15); 

    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        planet.modules[moduleType]++;
        if (moduleType === 'hab') gameState.maxColonists += 5;
        updateUI();
        renderPlanets();
    }
}

function assignWorker(planetId, amount) {
    const planet = gameState.planets.find(p => p.id === planetId);
    const totalAssigned = gameState.planets.reduce((sum, p) => sum + p.assignedWorkers, 0);
    if (amount > 0 && totalAssigned < gameState.colonists) {
        planet.assignedWorkers++;
    } else if (amount < 0 && planet.assignedWorkers > 0) {
        planet.assignedWorkers--;
    }
    renderPlanets();
    updateUI();
}

// --- ENGINE & ANOMALIES ---

function checkForAnomalies() {
    if (Math.random() < 0.005) { // 0.5% chance per tick
        const events = [
            { name: "SPACE_DEBRIS", effect: () => { gameState.scrap += 50; return "SALVAGED_50_SCRAP_FROM_WRECKAGE"; }},
            { name: "SOLAR_FLARE", effect: () => { gameState.energy = Math.max(0, gameState.energy - 30); return "CRITICAL: ENERGY_DRAIN_DETECTED"; }},
            { name: "DATA_LEAK", effect: () => { gameState.data += 15; return "SIGNAL_INTERCEPTED: +15_DATA"; }}
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        const resultMsg = event.effect();
        logMessage(`ANOMALY: ${event.name} - ${resultMsg}`);
    }
}

function gameLoop() {
    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const totalModules = planet.modules.extractor + planet.modules.solarArray + planet.modules.lab;
        let workerRatio = totalModules > 0 ? planet.assignedWorkers / totalModules : 0;
        const effectiveness = Math.min(1, 0.1 + workerRatio);

        let drillBonus = 1 + (gameState.upgrades.advancedDrills * 0.1);
        gameState.scrap += (planet.modules.extractor * 0.25 * biome.scrap * drillBonus * effectiveness / 10);

        let cryoBonus = (planet.type === "Frozen" && gameState.upgrades.cryoPipes) ? 2.5 : 1;
        gameState.energy += (planet.modules.solarArray * 0.4 * biome.energy * cryoBonus * effectiveness / 10);
        gameState.data += (planet.modules.lab * 0.1 * effectiveness / 10);

        if (planet.assignedWorkers > 0) gameState.energy -= (planet.assignedWorkers * 0.1 * biome.oxygenCost / 10);
        if (planet.isExporting) gameState.energy -= 0.2 / 10; 
    });

    gameState.energy += 0.05; 
    checkForAnomalies();
    updateUI();
}

// --- UI RENDERING ---

function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('data-display').innerText = Math.floor(gameState.data);
    document.getElementById('pop-display').innerText = `${gameState.colonists} / ${gameState.maxColonists}`;
    document.getElementById('ship-display').innerText = `${gameState.activeRoutes} / ${gameState.freighters}`;
    document.getElementById('unassigned-display').innerText = gameState.colonists - gameState.planets.reduce((sum, p) => sum + p.assignedWorkers, 0);
}

function renderPlanets() {
    const list = document.getElementById('planet-list');
    list.innerHTML = ''; 
    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between;"><strong>${planet.name}</strong><span style="color: #00ff41;">[${planet.type.toUpperCase()}]</span></div>
            <div style="font-size: 10px; color: #888;">WORKERS: ${planet.assignedWorkers} | LS: x${biome.oxygenCost}</div>
            <div style="margin: 5px 0;">
                <button onclick="assignWorker('${planet.id}', 1)">+W</button>
                <button onclick="assignWorker('${planet.id}', -1)">-W</button>
                <button onclick="toggleTrade('${planet.id}')" style="color: ${planet.isExporting ? '#000' : '#00ff41'}; background: ${planet.isExporting ? '#00ff41' : 'transparent'}">TRADE</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="buildModule('${planet.id}', 'extractor')">EXT [${planet.modules.extractor}]</button>
                <button onclick="buildModule('${planet.id}', 'solarArray')">SOL [${planet.modules.solarArray}]</button>
                <button onclick="buildModule('${planet.id}', 'lab')">LAB [${planet.modules.lab}]</button>
                <button onclick="buildModule('${planet.id}', 'hab')">HAB [${planet.modules.hab}]</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderLog() {
    const log = document.getElementById('event-log');
    if (log) log.innerHTML = gameState.eventLog.join('<br>');
}

function renderResearch() {
    const container = document.getElementById('research-list');
    if(!container) return;
    container.innerHTML = `
        <button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled' : ''}>CRYO_PIPES (50 DATA)</button>
        <button onclick="buyUpgrade('advancedDrills')">ADV_DRILLS (${100 + gameState.upgrades.advancedDrills * 50} DATA)</button>
        <button onclick="buyUpgrade('signalBoosters')">BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50} DATA)</button>
    `;
}

setInterval(gameLoop, 100);
renderResearch();
