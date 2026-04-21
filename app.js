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
    sectors: [], 
    scanCost: 10,
    maxPlanets: 3,
    upgrades: {
        cryoPipes: false,
        advancedDrills: 0,
        signalBoosters: 0
    },
    megaStage: 0,
    megaProgress: 0,
    eventLog: [],
    lastTick: Date.now()
};

// --- CONFIGURATION ---
const SECTOR_TYPES = {
    "VOID": { scrap: 1.0, energy: 1.0, data: 1.0, color: "#444", desc: "Stable vacuum; standard yield." },
    "NEBULA": { scrap: 0.8, energy: 0.7, data: 1.5, color: "#a0f", desc: "Charged gases boost sensors (+Data, -Energy)." },
    "ASTEROID_BELT": { scrap: 1.8, energy: 1.0, data: 0.7, color: "#f80", desc: "Dense mineral deposits (+Scrap)." },
    "STELLAR_FORGE": { scrap: 0.5, energy: 2.0, data: 1.0, color: "#f00", desc: "High solar radiation (+Energy, -Scrap)." }
};

const BIOMES = {
    "Volcanic": { scrap: 0.8, energy: 1.5, oxygenCost: 1.5, desc: "High Thermal / Dense Crust" },
    "Frozen":   { scrap: 0.7, energy: 0.5, oxygenCost: 1.0, desc: "Low Solar / Supercooled" },
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

const MEGA_STAGES = [
    { name: "SATELLITE_ARRAY", scrap: 1000, data: 500, energy: 500, desc: "Deploying primary solar collection net." },
    { name: "THERMAL_COLLECTORS", scrap: 5000, data: 2500, energy: 2000, desc: "Installing high-heat absorption panels." },
    { name: "ENERGY_TRANSMITTER", scrap: 15000, data: 10000, energy: 10000, desc: "Building the orbital microwave link." },
    { name: "DYSON_COMPLETE", scrap: 0, data: 0, energy: 0, desc: "The star is fully harnessed." }
];

const PREFIXES = ["Nova", "Sector", "Exo", "Prime", "Void", "Krypton", "Zenith"];

// --- CORE ENGINE & LOGGING ---

function logMessage(msg) {
    gameState.eventLog.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (gameState.eventLog.length > 8) gameState.eventLog.pop();
    renderLog();
}

function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('data-display').innerText = Math.floor(gameState.data);
    document.getElementById('pop-display').innerText = `${gameState.colonists} / ${gameState.maxColonists}`;
    document.getElementById('ship-display').innerText = `${gameState.activeRoutes} / ${gameState.freighters}`;
    document.getElementById('colony-display').innerText = `${gameState.planets.length} / ${gameState.maxPlanets}`;
    document.getElementById('unassigned-display').innerText = gameState.colonists - gameState.planets.reduce((sum, p) => sum + p.assignedWorkers, 0);

    // Update Button Labels
    document.getElementById('btn-scan').innerText = `[ EXECUTE_SCAN ] (${gameState.scanCost} ENERGY)`;
    document.getElementById('btn-recruit').innerText = `[ RECRUIT_COLONIST ] (${20 + (gameState.colonists * 10)} SCRAP)`;
    document.getElementById('btn-freighter').innerText = `[ CONSTRUCT_FREIGHTER ] (${50 + (gameState.freighters * 25)} SCRAP)`;
    document.getElementById('btn-command').innerText = `[ EXPAND_COMMAND ] (${Math.pow(gameState.maxPlanets, 2) * 25} SCRAP)`;
}

// --- SCANNING & DISCOVERY ---

function manualScan() {
    if (gameState.planets.length >= gameState.maxPlanets) {
        logMessage("CRITICAL: COMMAND_CAPACITY_REACHED.");
        return;
    }
    if (gameState.energy >= gameState.scanCost) {
        gameState.energy -= gameState.scanCost;
        
        const lastSector = gameState.sectors[gameState.sectors.length - 1];
        if (!lastSector || lastSector.planets.length >= 2) {
            createNewSector();
        } else {
            discoverPlanet(lastSector.id);
        }

        let multiplier = 1.6 - (gameState.upgrades.signalBoosters * 0.05);
        gameState.scanCost = Math.floor(gameState.scanCost * Math.max(1.1, multiplier));
        updateUI();
    } else {
        logMessage("ERROR: INSUFFICIENT_ENERGY.");
    }
}

function createNewSector() {
    const types = Object.keys(SECTOR_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const id = "SEC-" + Math.floor(Math.random() * 99);
    gameState.sectors.push({ id, type, planets: [] });
    logMessage(`SYSTEM: ENTERED ${id} (${type}).`);
    discoverPlanet(id);
}

function discoverPlanet(sectorId) {
    const id = Math.random().toString(36).substr(2, 9);
    const type = Object.keys(BIOMES)[Math.floor(Math.random() * 5)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
    gameState.planets.push({
        id, name, type, sectorId, 
        assignedWorkers: 0, isExporting: false, specialization: "NONE",
        modules: { extractor: 0, solarArray: 0, lab: 0, hab: 0 }
    });
    
    gameState.sectors.find(s => s.id === sectorId).planets.push(id);
    logMessage(`SUCCESS: DISCOVERED ${name}.`);
    renderPlanets();
}

// --- ACTIONS ---

function manualScrap() {
    gameState.scrap += 1;
    updateUI();
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
    } else {
        logMessage("INSUFFICIENT_SCRAP_FOR_MODULE.");
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

function specializePlanet(planetId, specType) {
    const planet = gameState.planets.find(p => p.id === planetId);
    if (gameState.data >= 250) {
        gameState.data -= 250;
        planet.specialization = specType;
        logMessage(`SYSTEM: ${planet.name} RECONFIGURED TO ${specType}.`);
        renderPlanets();
        updateUI();
    } else { logMessage("ERROR: 250 DATA REQUIRED."); }
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

function contributeToMega() {
    const stage = MEGA_STAGES[gameState.megaStage];
    if (gameState.megaStage >= 3) return;

    if (gameState.scrap >= stage.scrap/10 && gameState.data >= stage.data/10 && gameState.energy >= stage.energy/10) {
        gameState.scrap -= stage.scrap/10;
        gameState.data -= stage.data/10;
        gameState.energy -= stage.energy/10;
        gameState.megaProgress += 10;

        if (gameState.megaProgress >= 100) {
            gameState.megaProgress = 0;
            gameState.megaStage++;
            logMessage(`MEGASTRUCTURE: ${MEGA_STAGES[gameState.megaStage-1].name} COMPLETED.`);
        }
        updateUI();
        renderMega();
    } else {
        logMessage("INSUFFICIENT_RESOURCES_FOR_PHASE.");
    }
}

// --- SAVE SYSTEM ---

function saveToLocal() {
    localStorage.setItem('orbitalCommandSave', JSON.stringify(gameState));
    logMessage("SYSTEM: DATA_BACKUP_SUCCESSFUL.");
}

function loadFromLocal() {
    const savedData = localStorage.getItem('orbitalCommandSave');
    if (savedData) {
        gameState = JSON.parse(savedData);
        renderPlanets();
        renderResearch();
        renderMega();
        updateUI();
        logMessage("SYSTEM: LOCAL_DATA_RESTORED.");
    }
}

function exportSave() {
    window.prompt("COPY_SAVE_CODE:", btoa(JSON.stringify(gameState)));
}

function importSave() {
    const code = window.prompt("PASTE_SAVE_CODE:");
    if (code) {
        gameState = JSON.parse(atob(code));
        saveToLocal();
        location.reload();
    }
}

// --- MAIN LOOP ---

function gameLoop() {
    gameState.planets.forEach(p => {
        const sec = gameState.sectors.find(s => s.id === p.sectorId);
        const sM = SECTOR_TYPES[sec.type];
        const bM = BIOMES[p.type];
        const sp = SPECIALIZATIONS[p.specialization];
        const totalMod = p.modules.extractor + p.modules.solarArray + p.modules.lab;
        let eff = totalMod > 0 ? Math.min(1, 0.1 + (p.assignedWorkers / totalMod)) : 0.1;

        // Production
        gameState.scrap += (p.modules.extractor * 0.25 * bM.scrap * (1 + gameState.upgrades.advancedDrills * 0.1) * sp.scrap * sM.scrap * eff / 10);
        let eGain = (p.modules.solarArray * 0.4 * bM.energy * (p.type === "Frozen" && gameState.upgrades.cryoPipes ? 2.5 : 1) * sp.energy * sM.energy * eff / 10);
        if (gameState.megaStage >= 3) eGain *= 100;
        gameState.energy += eGain;
        gameState.data += (p.modules.lab * 0.1 * sp.data * sM.data * eff / 10);

        // Drain
        let drainMult = (gameState.megaStage < 3 && gameState.megaProgress > 0) ? 1.25 : 1.0; 
        if (p.assignedWorkers > 0) gameState.energy -= (p.assignedWorkers * 0.1 * bM.oxygenCost * drainMult / 10);
        if (p.isExporting) gameState.energy -= (0.2 * drainMult / 10); 
    });

    gameState.energy += 0.05; 
    
    // Random Anomalies
    if (Math.random() < 0.005) {
        const events = [
            { n: "SPACE_DEBRIS", f: () => { gameState.scrap += 50; return "+50_SCRAP"; }},
            { n: "SIGNAL_DECODE", f: () => { gameState.data += 20; return "+20_DATA"; }}
        ];
        const e = events[Math.floor(Math.random() * events.length)];
        logMessage(`ANOMALY: ${e.n} (${e.f()})`);
    }

    updateUI();
}

// --- RENDERING ---

function renderPlanets() {
    const list = document.getElementById('planet-list');
    list.innerHTML = ''; 
    gameState.sectors.forEach(s => {
        const sM = SECTOR_TYPES[s.type];
        const h = document.createElement('div');
        h.className = 'sector-header';
        h.style.cssText = `border-left: 4px solid ${sM.color}; padding: 8px; margin-top: 25px; background: #111;`;
        h.innerHTML = `<strong style="color:${sM.color}">${s.id} // ${s.type}</strong><br><small style="color:#666">${sM.desc}</small>`;
        list.appendChild(h);

        gameState.planets.filter(p => p.sectorId === s.id).forEach(p => {
            const b = BIOMES[p.type];
            const card = document.createElement('div');
            card.className = 'planet-card';
            const tot = p.modules.extractor + p.modules.solarArray + p.modules.lab + p.modules.hab;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between"><strong>${p.name}</strong><span style="color:#00ff41">[${p.specialization !== 'NONE' ? p.specialization : p.type.toUpperCase()}]</span></div>
                <div style="font-size:10px; color:#555">${b.desc}</div>
                <div style="margin:8px 0; display:flex; justify-content:space-between">
                    <div><button onclick="assignWorker('${p.id}', 1)">+W</button><button onclick="assignWorker('${p.id}', -1)">-W</button></div>
                    <button onclick="toggleTrade('${p.id}')" style="background:${p.isExporting ? '#00ff41':'transparent'}; color:${p.isExporting ? '#000':'#00ff41'}">${p.isExporting ? '[EXPORTING]':'[TRADE]'}</button>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px">
                    <button onclick="buildModule('${p.id}', 'extractor')">EXTR [${p.modules.extractor}]</button>
                    <button onclick="buildModule('${p.id}', 'solarArray')">SOLR [${p.modules.solarArray}]</button>
                    <button onclick="buildModule('${p.id}', 'lab')">LAB [${p.modules.lab}]</button>
                    <button onclick="buildModule('${p.id}', 'hab')">HAB [${p.modules.hab}]</button>
                </div>
                ${tot >= 5 && p.specialization === "NONE" ? `<div class="spec-box"><small>SPECIALIZE (250D)</small><br><button onclick="specializePlanet('${p.id}','FORGE')">FORGE</button><button onclick="specializePlanet('${p.id}','POWER')">POWER</button><button onclick="specializePlanet('${p.id}','ARCHIVE')">ARCHIVE</button></div>` : ''}
            `;
            list.appendChild(card);
        });
    });
}

function renderMega() {
    const s = MEGA_STAGES[gameState.megaStage];
    const c = document.getElementById('mega-section');
    if (gameState.megaStage >= 3) {
        c.innerHTML = `<h3 style="color:#00ff41">DYSON_SWARM_ONLINE</h3><small>Star Captured.</small>`;
        return;
    }
    c.innerHTML = `
        <h3 style="color:#ffaa00">PROJECT: ${s.name}</h3>
        <div style="background:#111; height:8px; margin-bottom:8px">
            <div style="background:#ffaa00; height:100%; width:${gameState.megaProgress}%"></div>
        </div>
        <button onclick="contributeToMega()" style="width:100%; border-color:#ffaa00; color:#ffaa00;">CONSTRUCT_PHASE</button>
    `;
}

function renderLog() { document.getElementById('event-log').innerHTML = gameState.eventLog.join('<br>'); }
function renderResearch() {
    const r = document.getElementById('research-list');
    r.innerHTML = `
        <button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled':''}>CRYO_PIPES (50D)</button>
        <button onclick="buyUpgrade('advancedDrills')">DRILLS (${100 + gameState.upgrades.advancedDrills * 50}D)</button>
        <button onclick="buyUpgrade('signalBoosters')">BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50}D)</button>
    `;
}

window.onload = () => {
    loadFromLocal();
    setInterval(gameLoop, 100);
    renderResearch();
    renderMega();
};
