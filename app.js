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
    lastTick: Date.now()
};

// --- CONFIGURATION ---
const BIOMES = {
    "Volcanic": { scrap: 0.8, energy: 1.5, oxygenCost: 1.5, desc: "High Thermal Output / Dense Crust" },
    "Frozen":   { scrap: 0.7, energy: 0.5, oxygenCost: 1.0, desc: "Low Solar / Supercooled Circuits" },
    "Metallic": { scrap: 2.0, energy: 0.8, oxygenCost: 1.2, desc: "Rich Ores / Heavy Gravity" },
    "Gaseous":  { scrap: 0.2, energy: 1.2, oxygenCost: 2.0, desc: "Atmospheric Fuel / No Solid Ground" },
    "Desert":   { scrap: 1.1, energy: 2.0, oxygenCost: 0.8, desc: "Clear Skies / Dry Air" }
};

const PREFIXES = ["Nova", "Sector", "Exo", "Prime", "Void", "Krypton", "Zenith"];

// --- CORE FUNCTIONS ---

function manualScrap() {
    gameState.scrap += 1;
    updateUI();
}

function manualScan() {
    if (gameState.planets.length >= gameState.maxPlanets) {
        alert("CRITICAL: COMMAND_CAPACITY_REACHED.");
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

function recruitColonist() {
    const cost = 20 + (gameState.colonists * 10);
    if (gameState.scrap >= cost && gameState.colonists < gameState.maxColonists) {
        gameState.scrap -= cost;
        gameState.colonists++;
        updateUI();
    }
}

function buildFreighter() {
    const cost = 50 + (gameState.freighters * 25);
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.freighters++;
        updateUI();
    }
}

function upgradeCommand() {
    const cost = Math.pow(gameState.maxPlanets, 2) * 25; 
    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        gameState.maxPlanets++;
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
        modules: {
            extractor: 0,
            solarArray: 0,
            lab: 0,
            hab: 0
        }
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
            alert("ALERT: NO_AVAILABLE_FREIGHTERS.");
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
        renderPlanets();
        updateUI();
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

function gameLoop() {
    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const totalModules = planet.modules.extractor + planet.modules.solarArray + planet.modules.lab;
        
        let workerRatio = totalModules > 0 ? planet.assignedWorkers / totalModules : 0;
        const effectiveness = Math.min(1, 0.1 + workerRatio);

        let drillBonus = 1 + (gameState.upgrades.advancedDrills * 0.1);
        let scrapProd = (planet.modules.extractor * 0.25 * biome.scrap * drillBonus * effectiveness);
        let cryoBonus = (planet.type === "Frozen" && gameState.upgrades.cryoPipes) ? 2.5 : 1;
        let energyProd = (planet.modules.solarArray * 0.4 * biome.energy * cryoBonus * effectiveness);
        let dataProd = (planet.modules.lab * 0.1 * effectiveness);

        gameState.scrap += (scrapProd / 10);
        gameState.energy += (energyProd / 10);
        gameState.data += (dataProd / 10);

        if (planet.assignedWorkers > 0) {
            gameState.energy -= (planet.assignedWorkers * 0.1 * biome.oxygenCost / 10);
        }
        if (planet.isExporting) {
            gameState.energy -= 0.2; 
        }
    });

    gameState.energy += 0.05; 
    updateUI();
}

// --- UI RENDERING ---

function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('data-display').innerText = Math.floor(gameState.data);
    document.getElementById('pop-display').innerText = `${gameState.colonists} / ${gameState.maxColonists}`;
    document.getElementById('ship-display').innerText = `${gameState.activeRoutes} / ${gameState.freighters}`;
    
    const unassigned = gameState.colonists - gameState.planets.reduce((sum, p) => sum + p.assignedWorkers, 0);
    document.getElementById('unassigned-display').innerText = unassigned;

    document.querySelector('button[onclick="manualScan()"]').innerText = `[ EXECUTE_SCAN ] (${gameState.scanCost} ENERGY)`;
    document.querySelector('button[onclick="recruitColonist()"]').innerText = `[ RECRUIT_COLONIST ] (${20 + (gameState.colonists * 10)} SCRAP)`;
    document.querySelector('button[onclick="buildFreighter()"]').innerText = `[ CONSTRUCT_FREIGHTER ] (${50 + (gameState.freighters * 25)} SCRAP)`;
    document.querySelector('button[onclick="upgradeCommand()"]').innerText = `[ EXPAND_COMMAND_CENTER ] (${Math.pow(gameState.maxPlanets, 2) * 25} SCRAP)`;
}

function renderPlanets() {
    const list = document.getElementById('planet-list');
    list.innerHTML = ''; 

    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const card = document.createElement('div');
        card.className = 'planet-card';
        const extCost = 10 + (planet.modules.extractor * 15);
        const solCost = 10 + (planet.modules.solarArray * 15);
        const labCost = 50 + (planet.modules.lab * 15);
        const habCost = 30 + (planet.modules.hab * 15);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <strong>DESIGNATION: ${planet.name}</strong>
                <span style="color: #00ff41;">[BIOME: ${planet.type.toUpperCase()}]</span>
            </div>
            <div style="font-size: 10px; color: #555;">ENVIRONMENT: ${biome.desc}</div>
            <div style="font-size: 10px; color: #888;">WORKERS: ${planet.assignedWorkers} | LIFE_SUPPORT_DRAIN: x${biome.oxygenCost}</div>
            
            <div style="margin: 10px 0; display: flex; justify-content: space-between;">
                <div>
                    <button onclick="assignWorker('${planet.id}', 1)">+ ASSIGN_WORKER</button>
                    <button onclick="assignWorker('${planet.id}', -1)">- REMOVE_WORKER</button>
                </div>
                <button onclick="toggleTrade('${planet.id}')" style="background: ${planet.isExporting ? '#00ff41' : 'transparent'}; color: ${planet.isExporting ? '#000' : '#00ff41'}">
                    ${planet.isExporting ? '[EXPORT_ACTIVE]' : '[ESTABLISH_TRADE_ROUTE]'}
                </button>
            </div>

            <hr border="1" color="#222">
            
            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="buildModule('${planet.id}', 'extractor')">RESOURCE_EXTRACTOR [${planet.modules.extractor}] (${extCost} SCRAP)</button>
                <button onclick="buildModule('${planet.id}', 'solarArray')">SOLAR_ARRAY [${planet.modules.solarArray}] (${solCost} SCRAP)</button>
                <button onclick="buildModule('${planet.id}', 'lab')">RESEARCH_LAB [${planet.modules.lab}] (${labCost} SCRAP)</button>
                <button onclick="buildModule('${planet.id}', 'hab')">HABITATION_UNIT [${planet.modules.hab}] (${habCost} SCRAP)</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderResearch() {
    const container = document.getElementById('research-list');
    if(!container) return;
    container.innerHTML = `
        <button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled' : ''}>CRYO_PIPES (50 DATA) - Boost Solar on Frozen worlds</button>
        <button onclick="buyUpgrade('advancedDrills')">ADVANCED_DRILLS (${100 + gameState.upgrades.advancedDrills * 50} DATA) - +10% Scrap output</button>
        <button onclick="buyUpgrade('signalBoosters')">SIGNAL_BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50} DATA) - Reduce Scanning cost</button>
    `;
}

setInterval(gameLoop, 100);
renderResearch();
