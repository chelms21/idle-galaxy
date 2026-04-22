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
gameState.automation = {
    autoScan: false,
    autoRecruit: false,
    autoSiphon: false
};
gameState.routinesActive = {
    autoScan: false,
    autoRecruit: false,
    autoSiphon: false
};

// --- CONFIGURATION ---
const SECTOR_TYPES = {
    "VOID": { scrap: 1.0, energy: 1.0, data: 1.0, color: "#444", desc: "Stable vacuum; standard yield." },
    "NEBULA": { scrap: 0.8, energy: 0.7, data: 1.5, color: "#a0f", desc: "Charged gases boost sensors (+Data, -Energy)." },
    "ASTEROID_BELT": { scrap: 1.8, energy: 1.0, data: 0.7, color: "#f80", desc: "Dense mineral deposits (+Scrap)." },
    "STELLAR_FORGE": { scrap: 0.5, energy: 2.0, data: 1.0, color: "#f00", desc: "High solar radiation (+Energy, -Scrap)." }
};

const TECH_TREE = {
    "SIGNAL_BOOSTERS": { 
        name: "SIGNAL_BOOSTERS", 
        cost: 75, 
        desc: "Reduces scan cost scaling.", 
        requires: null,
        onPurchase: () => { gameState.upgrades.signalBoosters++; }
    },
    "ADVANCED_DRILLS": { 
        name: "ADVANCED_DRILLS", 
        cost: 150, 
        desc: "Increases scrap yield efficiency.", 
        requires: "SIGNAL_BOOSTERS",
        onPurchase: () => { gameState.upgrades.advancedDrills++; }
    },
    "CRYO_PIPES": { 
        name: "CRYO_PIPES", 
        cost: 100, 
        desc: "Doubles energy on Frozen worlds.", 
        requires: "SIGNAL_BOOSTERS",
        onPurchase: () => { gameState.upgrades.cryoPipes = true; }
    },
    "AUTO_SCANNER": { 
        name: "AUTO_SCANNER", 
        cost: 500, 
        desc: "Automated exploration protocols.", 
        requires: "CRYO_PIPES",
        onPurchase: () => { /* Logic for next update */ }
    },
    "AUTO_SCAN_PROTOCOL": { 
        name: "AUTO_SCAN_PROTOCOL", 
        cost: 500, 
        desc: "Executes planet scans automatically when energy is capped.", 
        requires: "SIGNAL_BOOSTERS",
        onPurchase: () => { gameState.automation.autoScan = true; }
    },
    "SIPHON_LINK": { 
        name: "SIPHON_LINK", 
        cost: 1000, 
        desc: "Automatically contributes to Megastructure when resources are high.", 
        requires: "ADVANCED_DRILLS",
        onPurchase: () => { gameState.automation.autoSiphon = true; }
    }
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
    // NEW: Initialize assignedFreighters
    gameState.sectors.push({ id, type, planets: [], assignedFreighters: 0 });
    logMessage(`SYSTEM: ENTERED ${id} (${type}).`);
    discoverPlanet(id);
    gameState.selectedSector = id; 
}

function discoverPlanet(sectorId) {
    const id = Math.random().toString(36).substr(2, 9);
    const types = Object.keys(BIOMES);
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    
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

// NEW: Fleet Management Logic
function manageSectorFleet(amount) {
    if (!gameState.selectedSector) return;
    const sector = gameState.sectors.find(s => s.id === gameState.selectedSector);
    
    const totalAssigned = gameState.sectors.reduce((sum, s) => sum + (s.assignedFreighters || 0), 0);
    const available = gameState.freighters - totalAssigned;

    if (amount > 0 && available > 0) {
        sector.assignedFreighters = (sector.assignedFreighters || 0) + 1;
    } else if (amount < 0 && sector.assignedFreighters > 0) {
        sector.assignedFreighters--;
    } else {
        logMessage("FLEET_COMMAND: INVALID_TRANSFER_REQUEST.");
    }
    renderPlanets();
    updateConsole();
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

function buyUpgrade(techKey) {
    const tech = TECH_TREE[techKey];
    
    const isUnlocked = !tech.requires || (gameState.upgrades[tech.requires.toLowerCase()] || gameState.upgrades.cryoPipes); 

    if (gameState.data >= tech.cost) {
        gameState.data -= tech.cost;
        tech.onPurchase();
        
        logMessage(`RESEARCH_COMPLETE: ${tech.name}_NODE_ACTIVE.`);
        renderResearch();
        updateUI();
    } else {
        logMessage("INSUFFICIENT_DATA_FOR_UPLINK.");
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
    let tickEnergy = 0.05; // Base passive energy gain
    let tickData = 0;
    const routineDrain = 0.5; // Energy drain per active script per second

    // 1. CALCULATE PLANETARY PRODUCTION
    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const spec = SPECIALIZATIONS[planet.specialization];
        const sector = gameState.sectors.find(s => s.id === planet.sectorId);
        const sectorMod = sector ? SECTOR_TYPES[sector.type] : { scrap: 1, energy: 1, data: 1 };
        
        // Logistics & Fleet Calculations
        let logisticsBonus = 1 + ((sector?.assignedFreighters || 0) * 0.1);
        let fleetDrain = ((sector?.assignedFreighters || 0) * 0.05) / 10;

        // Trait Modifiers
        const traitMod = (planet.traits || []).reduce((acc, t) => { 
            const mod = PLANET_TRAITS[t];
            return { scrap: acc.scrap * mod.scrap, energy: acc.energy * mod.energy, data: acc.data * mod.data };
        }, { scrap: 1, energy: 1, data: 1 });

        // Instability & Effectiveness
        let instability = (planet.modules.extractor > 8) ? 0.7 : 1.0;
        const totalModules = planet.modules.extractor + planet.modules.solarArray + planet.modules.lab;
        let effectiveness = totalModules > 0 ? Math.min(1, 0.1 + (planet.assignedWorkers / totalModules)) : 0.1;

        // Individual Resource Production
        let dBonus = 1 + (gameState.upgrades.advancedDrills * 0.1);
        let sProd = (planet.modules.extractor * 0.25 * biome.scrap * dBonus * spec.scrap * sectorMod.scrap * traitMod.scrap * instability * effectiveness * logisticsBonus / 10);
        
        let cBonus = (planet.type === "Frozen" && gameState.upgrades.cryoPipes) ? 2.5 : 1;
        let eProd = (planet.modules.solarArray * 0.4 * biome.energy * cBonus * spec.energy * sectorMod.energy * traitMod.energy * effectiveness * logisticsBonus / 10);
        
        // Dyson Swarm Victory Multiplier
        if (gameState.megaStage >= 3) eProd *= 100;
        
        let dProd = (planet.modules.lab * 0.1 * spec.data * sectorMod.data * traitMod.data * effectiveness * logisticsBonus / 10);

        // Colony Maintenance (Drain)
        let drainMult = (gameState.megaStage < 3 && gameState.megaProgress > 0) ? 1.25 : 1.0; 
        let eDrain = 0;
        if (planet.assignedWorkers > 0) eDrain += (planet.assignedWorkers * 0.1 * biome.oxygenCost * drainMult / 10);
        if (planet.isExporting) eDrain += (0.2 * drainMult / 10); 

        // Add to global tick totals
        tickScrap += sProd;
        tickEnergy += (eProd - (eDrain + fleetDrain));
        tickData += dProd;
    });

    // 2. EXECUTE AUTOMATION SCRIPTS (Outside the planet loop)
    if (gameState.routinesActive.autoScan && gameState.automation.autoScan) {
        tickEnergy -= (routineDrain / 10);
        if (gameState.energy >= gameState.scanCost) {
            manualScan();
            logMessage("AUTO_ROUTINE: PLANET_DISCOVERED.");
        }
    }
    
    if (gameState.routinesActive.autoSiphon && gameState.automation.autoSiphon) {
        tickEnergy -= (routineDrain / 10);
        const stage = MEGA_STAGES[gameState.megaStage];
        // Siphon if we have 150% of the required chunk for a phase
        if (gameState.scrap >= (stage.scrap * 0.15) && 
            gameState.data >= (stage.data * 0.15) && 
            gameState.energy >= (stage.energy * 0.15)) {
            contributeToMega();
        }
    }

    // 3. UPDATE GLOBAL STATE & RATES
    gameState.scrap += tickScrap;
    gameState.energy += tickEnergy;
    gameState.data += tickData;
    
    // Convert per-tick (100ms) to per-second for the UI
    gameState.rates = { 
        scrap: tickScrap * 10, 
        energy: tickEnergy * 10, 
        data: tickData * 10 
    };

    // 4. REFRESH UI
    updateUI();
}

// --- RENDERING ---

function updateUI() {
    const formatRate = (val) => (val >= 0 ? `+${val.toFixed(1)}` : `${val.toFixed(1)}`);
    const eDisplay = document.getElementById('energy-display');
    if(eDisplay) {
        eDisplay.innerText = `${Math.floor(gameState.energy)} (${formatRate(gameState.rates.energy)}/s)`;
        eDisplay.style.color = gameState.rates.energy < 0 ? "#ff4444" : "#00ff41";
    }

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

function toggleRoutine(routineKey) {
    gameState.routinesActive[routineKey] = !gameState.routinesActive[routineKey];
    renderAutomation();
}

function renderAutomation() {
    const container = document.getElementById('automation-list');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(gameState.automation).forEach(key => {
        if (gameState.automation[key]) {
            const isActive = gameState.routinesActive[key];
            const btn = document.createElement('button');
            btn.style.width = "100%";
            btn.style.background = isActive ? "#00ff4133" : "transparent";
            btn.style.borderColor = isActive ? "#00ff41" : "#333";
            btn.innerText = `${isActive ? '[RUNNING]' : '[STOPPED]'} ${key.toUpperCase()}`;
            btn.onclick = () => toggleRoutine(key);
            container.appendChild(btn);
        }
    });
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

    const totalAssigned = gameState.sectors.reduce((sum, s) => sum + (s.assignedFreighters || 0), 0);
    const available = gameState.freighters - totalAssigned;

    // NEW: Sector View with Fleet Controls
    sectorView.innerHTML = `
        <strong style="color:${sM.color}; font-size: 14px;">${sector.id}</strong><br>
        TYPE: ${sector.type}<br>
        ${sM.desc}<br><br>
        
        <div style="border: 1px solid #333; padding: 5px; margin-bottom: 10px;">
            <strong>FLEET_LOGISTICS:</strong><br>
            STATIONED: ${sector.assignedFreighters || 0}<br>
            AVAILABLE: ${available}<br>
            <button onclick="manageSectorFleet(1)">+ DEPLOY</button>
            <button onclick="manageSectorFleet(-1)">- RECALL</button>
        </div>

        <strong>AVAILABLE_NODES:</strong><br>
    `;

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
    const traitHTML = (p.traits || []).map(t => `<span style="color:#ffaa00; border:1px solid #ffaa00; padding:2px; font-size:9px; margin-right:5px;" title="${PLANET_TRAITS[t].desc}">${t}</span>`).join('');

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

function renderLog() { 
    const log = document.getElementById('event-log');
    if(log) log.innerHTML = gameState.eventLog.join('<br>'); 
}

function renderResearch() {
    const res = document.getElementById('research-list');
    if(!res) return;
    res.innerHTML = '';

    Object.keys(TECH_TREE).forEach(key => {
        const tech = TECH_TREE[key];
        const isBought = (key === 'CRYO_PIPES' && gameState.upgrades.cryoPipes) || 
                         (key === 'SIGNAL_BOOSTERS' && gameState.upgrades.signalBoosters > 0) ||
                         (key === 'ADVANCED_DRILLS' && gameState.upgrades.advancedDrills > 0);
        
        const canSee = !tech.requires || 
                       (tech.requires === 'SIGNAL_BOOSTERS' && gameState.upgrades.signalBoosters > 0) ||
                       (tech.requires === 'CRYO_PIPES' && gameState.upgrades.cryoPipes);

        if (canSee) {
            const btn = document.createElement('button');
            btn.style.width = "100%";
            btn.style.textAlign = "left";
            btn.style.marginBottom = "5px";
            btn.disabled = isBought;
            
            btn.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <span>${tech.name}</span>
                    <span>${isBought ? '[ACTIVE]' : tech.cost + 'D'}</span>
                </div>
                <div style="font-size:9px; color:#666; text-transform:none;">${tech.desc}</div>
            `;
            
            if (!isBought) btn.onclick = () => buyUpgrade(key);
            res.appendChild(btn);
        }
    });

    if (res.innerHTML === '') {
        res.innerHTML = '<div style="color:#444; font-size:10px;">NO_ACTIVE_RESEARCH_NODES_FOUND.</div>';
    }
}

function logMessage(msg) {
    gameState.eventLog.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (gameState.eventLog.length > 8) gameState.eventLog.pop();
    renderLog();
}

window.onload = () => {
    loadFromLocal();
    setInterval(gameLoop, 100);
    renderResearch();
    renderMega();
};
