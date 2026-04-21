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
    eventLog: [],
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

const SPECIALIZATIONS = {
    "NONE": { scrap: 1, energy: 1, data: 1 },
    "FORGE": { scrap: 2.5, energy: 0.5, data: 0.5 },
    "POWER": { scrap: 0.5, energy: 2.5, data: 0.5 },
    "ARCHIVE": { scrap: 0.5, energy: 0.5, data: 2.5 }
};

const PREFIXES = ["Nova", "Sector", "Exo", "Prime", "Void", "Krypton", "Zenith"];

// --- PERSISTENCE ---

function saveToLocal() {
    localStorage.setItem('orbitalCommandSave', JSON.stringify(gameState));
    logMessage("SYSTEM: DATA_BACKUP_SUCCESSFUL.");
}

function loadFromLocal() {
    const savedData = localStorage.getItem('orbitalCommandSave');
    if (savedData) {
        try {
            gameState = JSON.parse(savedData);
            logMessage("SYSTEM: LOCAL_DATA_RESTORED.");
            renderPlanets();
            renderResearch();
            updateUI();
        } catch (e) { logMessage("ERROR: CORRUPT_SAVE_DATA."); }
    }
}

function exportSave() {
    const saveString = btoa(JSON.stringify(gameState));
    window.prompt("COPY_SAVE_STRING_FOR_TRANSFER:", saveString);
}

function importSave() {
    const saveString = window.prompt("PASTE_SAVE_STRING:");
    if (saveString) {
        try {
            gameState = JSON.parse(atob(saveString));
            saveToLocal();
            location.reload();
        } catch (e) { alert("ERROR: INVALID_SAVE_STRING."); }
    }
}

// --- LOGGING ---
function logMessage(msg) {
    gameState.eventLog.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (gameState.eventLog.length > 8) gameState.eventLog.pop();
    renderLog();
}

// --- CORE ACTIONS ---

function manualScrap() {
    gameState.scrap += 1;
    updateUI();
}

function manualScan() {
    if (gameState.planets.length >= gameState.maxPlanets) {
        logMessage("CRITICAL: COMMAND_CAPACITY_REACHED.");
        return;
    }
    if (gameState.energy >= gameState.scanCost) {
        gameState.energy -= gameState.scanCost;
        discoverPlanet();
        let multiplier = 1.6 - (gameState.upgrades.signalBoosters * 0.05);
        gameState.scanCost = Math.floor(gameState.scanCost * Math.max(1.1, multiplier));
        updateUI();
    }
}

function discoverPlanet() {
    const id = Math.random().toString(36).substr(2, 9);
    const types = Object.keys(BIOMES);
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
    gameState.planets.push({
        id, name, type, assignedWorkers: 0, isExporting: false,
        specialization: "NONE",
        modules: { extractor: 0, solarArray: 0, lab: 0, hab: 0 }
    });
    logMessage(`SUCCESS: DISCOVERED ${name}.`);
    renderPlanets();
}

function recruitColonist() {
    const cost = 20 + (gameState.colonists * 10);
    if (gameState.scrap >= cost && gameState.colonists < gameState.maxColonists) {
        gameState.scrap -= cost;
        gameState.colonists++;
        logMessage("INFO: NEW_COLONIST_ARRIVED.");
        updateUI();
    }
}

function buildFreighter() {
    const cost = 50 + (gameState.freighters * 25);
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.freighters++;
        logMessage("INFO: FREIGHTER_CONSTRUCTION_COMPLETE.");
        updateUI();
    }
}

function upgradeCommand() {
    const cost = Math.pow(gameState.maxPlanets, 2) * 25; 
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.maxPlanets++;
        logMessage("UPGRADE: COMMAND_CENTER_CAPACITY_INCREASED.");
        updateUI();
    }
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

function specializePlanet(planetId, specType) {
    const planet = gameState.planets.find(p => p.id === planetId);
    if (gameState.data >= 250) {
        gameState.data -= 250;
        planet.specialization = specType;
        logMessage(`SYSTEM: ${planet.name} RECONFIGURED TO ${specType}_WORLD.`);
        renderPlanets();
        updateUI();
    } else { logMessage("INSUFFICIENT_DATA: 250 REQUIRED."); }
}

function toggleTrade(planetId) {
    const planet = gameState.planets.find(p => p.id === planetId);
    if (!planet.isExporting) {
        if (gameState.activeRoutes < gameState.freighters) {
            planet.isExporting = true;
            gameState.activeRoutes++;
        } else { logMessage("ALERT: NO_SHIPS_AVAILABLE."); }
    } else {
        planet.isExporting = false;
        gameState.activeRoutes--;
    }
    renderPlanets();
    updateUI();
}

function buyUpgrade(techType) {
    const costs = { cryoPipes: 50, advancedDrills: 100, signalBoosters: 75 };
    const cost = costs[techType] + (techType !== 'cryoPipes' ? gameState.upgrades[techType] * 50 : 0);
    if (gameState.data >= cost) {
        gameState.data -= cost;
        if (techType === 'cryoPipes') gameState.upgrades.cryoPipes = true;
        else gameState.upgrades[techType]++;
        renderResearch();
        updateUI();
    }
}

// --- MAIN LOOP ---

function gameLoop() {
    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const spec = SPECIALIZATIONS[planet.specialization];
        const totalModules = planet.modules.extractor + planet.modules.solarArray + planet.modules.lab;
        let effectiveness = totalModules > 0 ? Math.min(1, 0.1 + (planet.assignedWorkers / totalModules)) : 0.1;

        // Production
        let dBonus = 1 + (gameState.upgrades.advancedDrills * 0.1);
        gameState.scrap += (planet.modules.extractor * 0.25 * biome.scrap * dBonus * spec.scrap * effectiveness / 10);
        
        let cBonus = (planet.type === "Frozen" && gameState.upgrades.cryoPipes) ? 2.5 : 1;
        gameState.energy += (planet.modules.solarArray * 0.4 * biome.energy * cBonus * spec.energy * effectiveness / 10);
        
        gameState.data += (planet.modules.lab * 0.1 * spec.data * effectiveness / 10);

        // Drain
        if (planet.assignedWorkers > 0) gameState.energy -= (planet.assignedWorkers * 0.1 * biome.oxygenCost / 10);
        if (planet.isExporting) gameState.energy -= (0.2 / 10); 
    });

    gameState.energy += 0.05; 

    // Anomalies
    if (Math.random() < 0.005) { 
        const ev = [
            { n: "SPACE_DEBRIS", f: () => { gameState.scrap += 50; return "+50_SCRAP"; }},
            { n: "SOLAR_FLARE", f: () => { gameState.energy = Math.max(0, gameState.energy - 30); return "-30_ENERGY"; }},
            { n: "SIGNAL_DECODE", f: () => { gameState.data += 15; return "+15_DATA"; }}
        ];
        const e = ev[Math.floor(Math.random() * ev.length)];
        logMessage(`ANOMALY: ${e.n} (${e.f()})`);
    }

    // Auto-Save every 15 seconds roughly
    if (Math.random() < 0.01) saveToLocal();

    updateUI();
}

// --- RENDERING ---

function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('data-display').innerText = Math.floor(gameState.data);
    document.getElementById('pop-display').innerText = `${gameState.colonists} / ${gameState.maxColonists}`;
    document.getElementById('ship-display').innerText = `${gameState.activeRoutes} / ${gameState.freighters}`;
    document.getElementById('colony-display').innerText = `${gameState.planets.length} / ${gameState.maxPlanets}`;
    document.getElementById('unassigned-display').innerText = gameState.colonists - gameState.planets.reduce((s, p) => s + p.assignedWorkers, 0);

    document.getElementById('btn-scan').innerText = `[ EXECUTE_SCAN ] (${gameState.scanCost} ENERGY)`;
    document.getElementById('btn-recruit').innerText = `[ RECRUIT_COLONIST ] (${20 + (gameState.colonists * 10)} SCRAP)`;
    document.getElementById('btn-freighter').innerText = `[ CONSTRUCT_FREIGHTER ] (${50 + (gameState.freighters * 25)} SCRAP)`;
    document.getElementById('btn-command').innerText = `[ EXPAND_COMMAND_CENTER ] (${Math.pow(gameState.maxPlanets, 2) * 25} SCRAP)`;
}

function renderPlanets() {
    const list = document.getElementById('planet-list');
    list.innerHTML = ''; 
    gameState.planets.forEach(p => {
        const b = BIOMES[p.type];
        const card = document.createElement('div');
        card.className = 'planet-card';
        const totalMod = p.modules.extractor + p.modules.solarArray + p.modules.lab + p.modules.hab;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <strong>DESIGNATION: ${p.name}</strong>
                <span style="color: #00ff41;">[${p.specialization !== "NONE" ? p.specialization : p.type.toUpperCase()}]</span>
            </div>
            <div style="font-size: 10px; color: #555;">${b.desc}</div>
            <div style="font-size: 10px; color: #888;">WORKERS: ${p.assignedWorkers} | DRAIN: x${b.oxygenCost}</div>
            
            <div style="margin: 8px 0; display: flex; justify-content: space-between;">
                <div>
                    <button onclick="assignWorker('${p.id}', 1)">+ WORKER</button>
                    <button onclick="assignWorker('${p.id}', -1)">- WORKER</button>
                </div>
                <button onclick="toggleTrade('${p.id}')" style="background: ${p.isExporting ? '#00ff41' : 'transparent'}; color: ${p.isExporting ? '#000' : '#00ff41'}">
                    ${p.isExporting ? '[EXPORT_ACTIVE]' : '[ESTABLISH_TRADE]'}
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="buildModule('${p.id}', 'extractor')">EXTRACTOR [${p.modules.extractor}] (${10 + p.modules.extractor * 15}S)</button>
                <button onclick="buildModule('${p.id}', 'solarArray')">SOLAR [${p.modules.solarArray}] (${10 + p.modules.solarArray * 15}S)</button>
                <button onclick="buildModule('${p.id}', 'lab')">LAB [${p.modules.lab}] (${50 + p.modules.lab * 15}S)</button>
                <button onclick="buildModule('${p.id}', 'hab')">HAB [${p.modules.hab}] (${30 + p.modules.hab * 15}S)</button>
            </div>

            ${totalMod >= 5 && p.specialization === "NONE" ? `
                <div class="spec-box">
                    <div style="font-size: 10px; margin-bottom: 5px;">SPECIALIZE_COLONY (COST: 250 DATA)</div>
                    <button onclick="specializePlanet('${p.id}', 'FORGE')">FORGE</button>
                    <button onclick="specializePlanet('${p.id}', 'POWER')">POWER</button>
                    <button onclick="specializePlanet('${p.id}', 'ARCHIVE')">ARCHIVE</button>
                </div>
            ` : ''}
        `;
        list.appendChild(card);
    });
}

function renderLog() { document.getElementById('event-log').innerHTML = gameState.eventLog.join('<br>'); }

function renderResearch() {
    const res = document.getElementById('research-list');
    if(!res) return;
    res.innerHTML = `
        <button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled' : ''}>CRYO_PIPES (50 DATA)</button>
        <button onclick="buyUpgrade('advancedDrills')">ADV_DRILLS (${100 + gameState.upgrades.advancedDrills * 50} DATA)</button>
        <button onclick="buyUpgrade('signalBoosters')">SIGNAL_BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50} DATA)</button>
    `;
}

window.onload = () => {
    loadFromLocal();
    setInterval(gameLoop, 100);
    renderResearch();
};
