// --- INITIAL GAME STATE ---
let gameState = {
    energy: 100,
    scrap: 10, 
    data: 0,
    colonists: 0, 
    maxColonists: 5, 
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
    "Volcanic": { scrap: 0.8, energy: 1.5, oxygenCost: 1.5, desc: "High Thermal / Dangerous Air" },
    "Frozen":   { scrap: 0.7, energy: 0.5, oxygenCost: 1.0, desc: "Low Solar / Thin Atmosphere" },
    "Metallic": { scrap: 2.0, energy: 0.8, oxygenCost: 1.2, desc: "Rich Ores / Heavy Gravity" },
    "Gaseous":  { scrap: 0.2, energy: 1.2, oxygenCost: 2.0, desc: "Fuel Rich / Toxic Clouds" },
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
        alert("COMMAND_CAPACITY_REACHED.");
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
    } else if (gameState.colonists >= gameState.maxColonists) {
        alert("INSUFFICIENT_HABITATION: Build more Hab-Quarters.");
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
        assignedWorkers: 0,
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

function buildModule(planetId, moduleType) {
    const planet = gameState.planets.find(p => p.id === planetId);
    let baseCost = (moduleType === 'lab') ? 50 : (moduleType === 'hab') ? 30 : 10;
    const cost = baseCost + (planet.modules[moduleType] * 15); 

    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        planet.modules[moduleType]++;
        
        if (moduleType === 'hab') {
            gameState.maxColonists += 5;
        }
        
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
        gameState.scrap += (scrapProd / 10);

        let cryoBonus = (planet.type === "Frozen" && gameState.upgrades.cryoPipes) ? 2.5 : 1;
        let energyProd = (planet.modules.solarArray * 0.4 * biome.energy * cryoBonus * effectiveness);
        gameState.energy += (energyProd / 10);

        gameState.data += (planet.modules.lab * 0.1 * effectiveness / 10);

        if (planet.assignedWorkers > 0) {
            gameState.energy -= (planet.assignedWorkers * 0.1 * biome.oxygenCost / 10);
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
    
    const unassigned = gameState.colonists - gameState.planets.reduce((sum, p) => sum + p.assignedWorkers, 0);
    document.getElementById('unassigned-display').innerText = unassigned;

    // Update Manual Buttons with Prices
    const scanBtn = document.querySelector('button[onclick="manualScan()"]');
    if(scanBtn) scanBtn.innerText = `[ EXECUTE_SCAN ] (${gameState.scanCost} E)`;

    const recruitBtn = document.querySelector('button[onclick="recruitColonist()"]');
    const recruitCost = 20 + (gameState.colonists * 10);
    if(recruitBtn) recruitBtn.innerText = `[ RECRUIT_COLONIST ] (${recruitCost} S)`;

    const commandBtn = document.querySelector('button[onclick="upgradeCommand()"]');
    const commandCost = Math.pow(gameState.maxPlanets, 2) * 25; 
    if(commandBtn) commandBtn.innerText = `[ EXPAND_COMMAND ] (${commandCost} S)`;
}

function renderPlanets() {
    const list = document.getElementById('planet-list');
    list.innerHTML = ''; 

    gameState.planets.forEach(planet => {
        const biome = BIOMES[planet.type];
        const card = document.createElement('div');
        card.className = 'planet-card';
        
        // Dynamic costs for this specific planet
        const extCost = 10 + (planet.modules.extractor * 15);
        const solCost = 10 + (planet.modules.solarArray * 15);
        const labCost = 50 + (planet.modules.lab * 15);
        const habCost = 30 + (planet.modules.hab * 15);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <strong>SYS//: ${planet.name}</strong>
                <span style="color: #00ff41;">[${planet.type.toUpperCase()}]</span>
            </div>
            <div style="font-size: 10px; color: #555;">Workers: ${planet.assignedWorkers} | LS Cost: x${biome.oxygenCost}</div>
            <div style="margin: 5px 0;">
                <button onclick="assignWorker('${planet.id}', 1)">+ ASSIGN</button>
                <button onclick="assignWorker('${planet.id}', -1)">- REMOVE</button>
            </div>
            <hr border="1" color="#222">
            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="buildModule('${planet.id}', 'extractor')">EXTRACTOR [${planet.modules.extractor}] (${extCost}S)</button>
                <button onclick="buildModule('${planet.id}', 'solarArray')">SOLAR [${planet.modules.solarArray}] (${solCost}S)</button>
                <button onclick="buildModule('${planet.id}', 'lab')">LAB [${planet.modules.lab}] (${labCost}S)</button>
                <button onclick="buildModule('${planet.id}', 'hab')">HAB [${planet.modules.hab}] (${habCost}S)</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderResearch() {
    const container = document.getElementById('research-list');
    if(!container) return;
    container.innerHTML = `
        <button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled' : ''}>CRYO_PIPES (50D)</button>
        <button onclick="buyUpgrade('advancedDrills')">ADV_DRILLS (${100 + gameState.upgrades.advancedDrills * 50}D)</button>
        <button onclick="buyUpgrade('signalBoosters')">SIGNAL_BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50}D)</button>
    `;
}

setInterval(gameLoop, 100);
renderResearch();
