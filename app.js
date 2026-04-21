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
    selectedSector: null,
    selectedPlanet: null,
    rates: { scrap: 0, energy: 0, data: 0 },
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

const PLANET_TRAITS = {
    "RICH_CORE": { scrap: 1.5, energy: 1, data: 1, desc: "High-density mineral deposits (+50% Scrap)" },
    "ANCIENT_RUINS": { scrap: 1, energy: 1, data: 2.0, desc: "Xeno-tech signatures detected (+100% Data)" },
    "UNSTABLE": { scrap: 1.2, energy: 0.8, data: 1, desc: "Volatile geology (+Scrap, -Energy)" }
};

const MEGA_STAGES = [
    { name: "SATELLITE_ARRAY", scrap: 1000, data: 500, energy: 500, desc: "Deploying primary solar collection net." },
    { name: "THERMAL_COLLECTORS", scrap: 5000, data: 2500, energy: 2000, desc: "Installing high-heat absorption panels." },
    { name: "ENERGY_TRANSMITTER", scrap: 15000, data: 10000, energy: 10000, desc: "Building the orbital microwave link." },
    { name: "DYSON_COMPLETE", scrap: 0, data: 0, energy: 0, desc: "The star is fully harnessed. Victory achieved." }
];

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

// --- MEGASTRUCTURE FUNCTIONS ---

function contributeToMega() {
    const stage = MEGA_STAGES[gameState.megaStage];
    if (gameState.megaStage >= 3) return;

    const scrapChunk = stage.scrap * 0.1;
    const dataChunk = stage.data * 0.1;
    const energyChunk = stage.energy * 0.1;

    if (gameState.scrap >= scrapChunk && gameState.data >= dataChunk && gameState.energy >= energyChunk) {
        gameState.scrap -= scrapChunk;
        gameState.data -= dataChunk;
        gameState.energy -= energyChunk;
        gameState.megaProgress += 10;

        if (gameState.megaProgress >= 100) {
            gameState.megaProgress = 0;
            gameState.megaStage++;
            logMessage(`MEGASTRUCTURE: ${MEGA_STAGES[gameState.megaStage-1].name} COMPLETED.`);
        }
        updateUI();
        renderMega();
    } else {
        logMessage("INSUFFICIENT_RESOURCES_FOR_CONSTRUCTION_PHASE.");
    }
}

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
            if (!gameState.sectors) gameState.sectors = [];
            if (!gameState.rates) gameState.rates = { scrap: 0, energy: 0, data: 0 };
            
            logMessage("SYSTEM: LOCAL_DATA_RESTORED.");
            renderPlanets();
            renderResearch();
            renderMega();
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
        
        const lastSector = gameState.sectors[gameState.sectors.length - 1];
        if (!lastSector || lastSector.planets.length >= 2) {
            createNewSector();
        } else {
            discoverPlanet(lastSector.id);
        }

        let multiplier = 1.6 - (gameState.upgrades.signalBoosters * 0.05);
        gameState.scanCost = Math.floor(gameState.scanCost * Math.max(1.1, multiplier));
        updateUI();
    }
}

function createNewSector() {
    const types = Object.keys(SECTOR_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const id = "SEC-" + Math.floor(Math.random() * 99);
    gameState.sectors.push({ id, type, planets: [] });
    logMessage(`SYSTEM: ENTERED ${id} (${type}).`);
    discoverPlanet(id);
    gameState.selectedSector = id; // Focus new sector
}

function discoverPlanet(sectorId) {
    const id = Math.random().toString(36).substr(2, 9);
    const types = Object.keys(BIOMES);
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
    // 30% chance for a unique trait
    let traits = [];
    if (Math.random() < 0.3) {
        const traitKeys = Object.keys(PLANET_TRAITS);
        traits.push(traitKeys[Math.floor(Math.random() * traitKeys.length)]);
    }

    gameState.planets.push({
        id, name, type, sectorId, traits,
        assignedWorkers: 0, isExporting: false,
        specialization: "NONE",
        modules: { extractor: 0, solarArray: 0, lab: 0, hab: 0 }
    });

    if (sectorId) {
        const sector = gameState.sectors.find(s => s.id === sectorId);
        if (sector) sector.planets.push(id);
    }

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

// --- EVENT SYSTEM ---

function triggerRandomEvent() {
    const events = [
        { 
            name: "SOLAR_FLARE", 
            msg: "CRITICAL: SOLAR_FLARE_DETECTED. ENERGY_OUTPUT_HALVED.",
            action: () => { gameState.energy *= 0.9; }
        },
        { 
            name: "DATA_LEAK", 
            msg: "SIGNAL_FOUND: INTERCEPTED_ANCIENT_PROBE. +200_DATA.",
            action: () => { gameState.data += 200; }
        },
        { 
            name: "EQUIPMENT_FAILURE", 
            msg: "ALERT: SYSTEM_GLITCH_IN_SECTOR. -50_SCRAP.",
            action: () => { gameState.scrap = Math.max(0, gameState.scrap - 50); }
        }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    logMessage(ev.msg);
    ev.action();
    updateUI();
}

// --- MAIN LOOP ---

function gameLoop() {
    let tickScrap = 0;
    let tickEnergy = 0.05; 
    let tickData = 0;

    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const spec = SPECIALIZATIONS[planet.specialization];
        
        let sectorMod = { scrap: 1, energy: 1, data: 1 };
        if (planet.sectorId) {
            const sector = gameState.sectors.find(s => s.id === planet.sectorId);
            if (sector) sectorMod = SECTOR_TYPES[sector.type];
        }

        // Apply Trait Modifiers
        const traitMod = (planet.traits || []).reduce((acc, t) => { 
            const mod = PLANET_TRAITS[t];
            return { 
                scrap: acc.scrap * mod.scrap, 
                energy: acc.energy * mod.energy, 
                data: acc.data * mod.data 
            };
        }, { scrap: 1, energy: 1, data: 1 });

        // Instability: Diminishing returns on over-extraction
        let instability = (planet.modules.extractor > 8) ? 0.7 : 1.0;

        const totalModules = planet.modules.extractor + planet.modules.solarArray + planet.modules.lab;
        let effectiveness = totalModules > 0 ? Math.min(1, 0.1 + (planet.assignedWorkers / totalModules)) : 0.1;

        // Production Math
        let dBonus = 1 + (gameState.upgrades.advancedDrills * 0.1);
        let sProd = (planet.modules.extractor * 0.25 * biome.scrap * dBonus * spec.scrap * sectorMod.scrap * traitMod.scrap * instability * effectiveness / 10);
        
        let cBonus = (planet.type === "Frozen" && gameState.upgrades.cryoPipes) ? 2.5 : 1;
        let eProd = (planet.modules.solarArray * 0.4 * biome.energy * cBonus * spec.energy * sectorMod.energy * traitMod.energy * effectiveness / 10);
        if (gameState.megaStage >= 3) eProd *= 100;
        
        let dProd = (planet.modules.lab * 0.1 * spec.data * sectorMod.data * traitMod.data * effectiveness / 10);

        // Drain Math
        let drainMult = (gameState.megaStage < 3 && gameState.megaProgress > 0) ? 1.25 : 1.0; 
        let eDrain = 0;
        if (planet.assignedWorkers > 0) eDrain += (planet.assignedWorkers * 0.1 * biome.oxygenCost * drainMult / 10);
        if (planet.isExporting) eDrain += (0.2 * drainMult / 10); 

        tickScrap += sProd;
        tickEnergy += (eProd - eDrain);
        tickData += dProd;
    });

    gameState.scrap += tickScrap;
    gameState.energy += tickEnergy;
    gameState.data += tickData;

    gameState.rates.scrap = tickScrap * 10;
    gameState.rates.energy = tickEnergy * 10;
    gameState.rates.data = tickData * 10;

    // Trigger Random Events (0.1% chance per tick)
    if (Math.random() < 0.001) triggerRandomEvent();
    if (Math.random() < 0.01) saveToLocal();

    updateUI();
}

// --- RENDERING ---

function updateUI() {
    const formatRate = (val) => (val >= 0 ? `+${val.toFixed(1)}` : `${val.toFixed(1)}`);
    const eDisplay = document.getElementById('energy-display');
    eDisplay.innerText = `${Math.floor(gameState.energy)} (${formatRate(gameState.rates.energy)}/s)`;
    eDisplay.style.color = gameState.rates.energy < 0 ? "#ff4444" : "#00ff41";

    document.getElementById('scrap-display').innerText = `${Math.floor(gameState.scrap)} (${formatRate(gameState.rates.scrap)}/s)`;
    document.getElementById('data-display').innerText = `${Math.floor(gameState.data)} (${formatRate(gameState.rates.data)}/s)`;
    
    document.getElementById('pop-display').innerText = `${gameState.colonists} / ${gameState.maxColonists}`;
    document.getElementById('ship-display').innerText = `${gameState.activeRoutes} / ${gameState.freighters}`;
    document.getElementById('colony-display').innerText = `${gameState.planets.length} / ${gameState.maxPlanets}`;
    document.getElementById('unassigned-display').innerText = gameState.colonists - gameState.planets.reduce((s, p) => s + p.assignedWorkers, 0);

    document.getElementById('btn-scan').innerText = `[ EXECUTE_SCAN ] (${gameState.scanCost} ENERGY)`;
    document.getElementById('btn-recruit').innerText = `[ RECRUIT_COLONIST ] (${20 + (gameState.colonists * 10)} SCRAP)`;
    document.getElementById('btn-freighter').innerText = `[ CONSTRUCT_FREIGHTER ] (${50 + (gameState.freighters * 25)} SCRAP)`;
    document.getElementById('btn-command').innerText = `[ EXPAND_COMMAND_CENTER ] (${Math.pow(gameState.maxPlanets, 2) * 25} SCRAP)`;
}

function renderMega() {
    const stage = MEGA_STAGES[gameState.megaStage];
    const container = document.getElementById('mega-section');
    if (!container) return;

    if (gameState.megaStage >= 3) {
        container.innerHTML = `<h3 style="color:#00ff41;">DYSON_SWARM_COMPLETE</h3><p style="font-size:10px;">Primary star harnessed. Victory achieved.</p>`;
        return;
    }

    container.innerHTML = `
        <h3 style="color: #ffaa00;">PROJECT: ${stage.name}</h3>
        <div style="font-size: 10px; color: #888; margin-bottom: 5px;">${stage.desc}</div>
        <div style="background: #111; height: 10px; border: 1px solid #333; margin-bottom: 10px;">
            <div style="background: #ffaa00; height: 100%; width: ${gameState.megaProgress}%"></div>
        </div>
        <button onclick="contributeToMega()" style="width: 100%; border-color: #ffaa00; color: #ffaa00;">
            CONSTRUCT_PHASE (Costs: ${stage.scrap/10}S, ${stage.data/10}D, ${stage.energy/10}E)
        </button>
    `;
}

function renderPlanets() {
    const grid = document.getElementById('map-grid');
    grid.innerHTML = '';

    if (gameState.sectors.length === 0) {
        grid.innerHTML = '<div style="color: #444;">NO_SECTORS_FOUND. EXECUTE_SCAN.</div>';
        return;
    }

    gameState.sectors.forEach(s => {
        const sM = SECTOR_TYPES[s.type];
        const node = document.createElement('div');
        node.style.cssText = `
            width: 120px; height: 60px; border: 1px solid ${sM.color}; 
            background: ${gameState.selectedSector === s.id ? sM.color + '33' : '#111'};
            padding: 5px; cursor: pointer; text-align: center; font-size: 10px; transition: 0.2s;
        `;
        node.innerHTML = `<strong style="color:${sM.color}">${s.id}</strong><br><span style="color:#666">${s.type}</span><br><span style="color:#fff">${s.planets.length} NODES</span>`;
        node.onclick = () => {
            gameState.selectedSector = s.id;
            gameState.selectedPlanet = null;
            renderPlanets();
            updateConsole();
        };
        grid.appendChild(node);
    });
    updateConsole();
}

function updateConsole() {
    const sectorView = document.getElementById('selected-sector-view');
    const planetView = document.getElementById('selected-planet-view');
    if (!gameState.selectedSector) return;

    const sector = gameState.sectors.find(s => s.id === gameState.selectedSector);
    const sM = SECTOR_TYPES[sector.type];

    sectorView.innerHTML = `<strong style="color:${sM.color}; font-size: 14px;">${sector.id}</strong><br>TYPE: ${sector.type}<br>${sM.desc}<br><br><strong>AVAILABLE_NODES:</strong><br>`;

    gameState.planets.filter(p => p.sectorId === sector.id).forEach(p => {
        const pBtn = document.createElement('button');
        pBtn.style.width = "100%";
        pBtn.style.textAlign = "left";
        if (gameState.selectedPlanet === p.id) pBtn.style.background = "#00ff4133";
        pBtn.innerText = `> ${p.name}`;
        pBtn.onclick = () => {
            gameState.selectedPlanet = p.id;
            updateConsole();
        };
        sectorView.appendChild(pBtn);
    });

    if (!gameState.selectedPlanet) {
        planetView.innerHTML = `<div style="color:#444; margin-top:20px;">SELECT_PLANETARY_NODE_FOR_UPLINK...</div>`;
        return;
    }

    const p = gameState.planets.find(p => p.id === gameState.selectedPlanet);
    const b = BIOMES[p.type];
    const totalMod = p.modules.extractor + p.modules.solarArray + p.modules.lab + p.modules.hab;
    const traitHTML = p.traits.map(t => `<span style="color:#ffaa00; border:1px solid #ffaa00; padding:2px; font-size:9px; margin-right:5px;" title="${PLANET_TRAITS[t].desc}">${t}</span>`).join('');

    planetView.innerHTML = `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 5px;">
            <strong style="font-size: 16px;">NODE: ${p.name} [${p.type.toUpperCase()}]</strong>
            <div>${traitHTML} <span style="color: #00ff41;">SPEC: ${p.specialization}</span></div>
        </div>
        ${p.modules.extractor > 8 ? `<div style="color:#ff4444; font-size:10px; margin-top:5px; animation: blink 1s infinite;">!!! INSTABILITY_DETECTED: EFFICIENCY_PENALTY_ACTIVE !!!</div>` : ''}
        
        <div style="display: flex; gap: 40px; margin-top: 15px;">
            <div style="width: 200px;">
                <div style="font-size: 11px; color: #888; margin-bottom: 10px;">LABOR_MANAGEMENT</div>
                <button onclick="assignWorker('${p.id}', 1)">+ ADD_WORKER</button>
                <button onclick="assignWorker('${p.id}', -1)">- REMOVE_WORKER</button>
                <div style="margin-top: 10px;">ASSIGNED: ${p.assignedWorkers}</div>
                <div style="font-size: 9px; color: #555;">ENVIRONMENT_DRAIN: x${b.oxygenCost}</div>
            </div>
            <div style="flex-grow: 1;">
                <div style="font-size: 11px; color: #888; margin-bottom: 10px;">MODULE_CONSTRUCTION</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button onclick="buildModule('${p.id}', 'extractor')">EXTRACTOR [${p.modules.extractor}] (${10 + p.modules.extractor * 15}S)</button>
                    <button onclick="buildModule('${p.id}', 'solarArray')">SOLAR [${p.modules.solarArray}] (${10 + p.modules.solarArray * 15}S)</button>
                    <button onclick="buildModule('${p.id}', 'lab')">LAB [${p.modules.lab}] (${50 + p.modules.lab * 15}S)</button>
                    <button onclick="buildModule('${p.id}', 'hab')">HAB [${p.modules.hab}] (${30 + p.modules.hab * 15}S)</button>
                </div>
            </div>
            <div style="width: 180px;">
                <div style="font-size: 11px; color: #888; margin-bottom: 10px;">LOGISTICS</div>
                <button onclick="toggleTrade('${p.id}')" style="width: 100%; background: ${p.isExporting ? '#00ff41' : 'transparent'}; color: ${p.isExporting ? '#000' : '#00ff41'}">
                    ${p.isExporting ? '[EXPORT_ACTIVE]' : '[ESTABLISH_TRADE]'}
                </button>
                ${totalMod >= 5 && p.specialization === "NONE" ? `<div class="spec-box" style="margin-top:10px;"><button onclick="specializePlanet('${p.id}', 'FORGE')">FORGE</button><button onclick="specializePlanet('${p.id}', 'POWER')">POWER</button><button onclick="specializePlanet('${p.id}', 'ARCHIVE')">ARCHIVE</button></div>` : ''}
            </div>
        </div>
    `;
}

function renderLog() { document.getElementById('event-log').innerHTML = gameState.eventLog.join('<br>'); }

function renderResearch() {
    const res = document.getElementById('research-list');
    if(!res) return;
    res.innerHTML = `
        <button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled' : ''} title="Doubles Energy on Frozen worlds">CRYO_PIPES (50 DATA)</button>
        <button onclick="buyUpgrade('advancedDrills')" title="Increases Scrap extraction efficiency">ADV_DRILLS (${100 + gameState.upgrades.advancedDrills * 50} DATA)</button>
        <button onclick="buyUpgrade('signalBoosters')" title="Reduces the cost increase of future scans">SIGNAL_BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50} DATA)</button>
    `;
}

window.onload = () => {
    loadFromLocal();
    setInterval(gameLoop, 100);
    renderResearch();
    renderMega();
};
