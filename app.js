// --- INITIAL GAME STATE ---
let gameState = {
    energy: 100,
    scrap: 0,
    data: 0, // New Currency
    planets: [],
    scanCost: 10,
    maxPlanets: 3,
    // Tracking Upgrades
    upgrades: {
        cryoPipes: false,
        advancedDrills: 0, // Stackable
        signalBoosters: 0  // Stackable
    },
    lastTick: Date.now()
};

// --- CONFIGURATION ---
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
        
        // Signal Boosters reduce the cost spike
        let multiplier = 1.6 - (gameState.upgrades.signalBoosters * 0.05);
        gameState.scanCost = Math.floor(gameState.scanCost * Math.max(1.1, multiplier));
        
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
        scrapPerTick: 0.1 * BIOMES[type].scrap,
        energyPerTick: 0.05 * BIOMES[type].energy,
        dataPerTick: 0,
        modules: {
            extractor: 0,
            solarArray: 0,
            lab: 0
        }
    };

    gameState.planets.push(newPlanet);
    renderPlanets();
}

function buildModule(planetId, moduleType) {
    const planet = gameState.planets.find(p => p.id === planetId);
    let baseCost = (moduleType === 'lab') ? 50 : 10;
    const cost = baseCost + (planet.modules[moduleType] * 10); 

    if (gameState.scrap >= cost) {
        gameState.scrap -= cost;
        planet.modules[moduleType]++;
        
        if (moduleType === 'extractor') {
            let drillBonus = 1 + (gameState.upgrades.advancedDrills * 0.1);
            planet.scrapPerTick += (0.25 * BIOMES[planet.type].scrap * drillBonus);
        }
        if (moduleType === 'solarArray') {
            let cryoBonus = (planet.type === "Frozen" && gameState.upgrades.cryoPipes) ? 2.5 : 1;
            planet.energyPerTick += (0.4 * BIOMES[planet.type].energy * cryoBonus);
        }
        if (moduleType === 'lab') {
            planet.dataPerTick += 0.1; // Labs generate raw data
        }
        
        renderPlanets();
        updateUI();
    }
}

// --- RESEARCH FUNCTIONS ---

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

// --- ENGINE LOOP ---

function gameLoop() {
    gameState.planets.forEach(planet => {
        gameState.scrap += (planet.scrapPerTick / 10);
        gameState.energy += (planet.energyPerTick / 10);
        gameState.data += (planet.dataPerTick / 10);

        // Labs cost a tiny bit of energy to run
        if (planet.modules.lab > 0) {
            gameState.energy -= (0.05 * planet.modules.lab / 10);
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
        
        const extractCost = 10 + (planet.modules.extractor * 10);
        const solarCost = 10 + (planet.modules.solarArray * 10);
        const labCost = 50 + (planet.modules.lab * 10);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <strong>SYS//: ${planet.name}</strong>
                <span style="color: #00ff41;">[${planet.type.toUpperCase()}]</span>
            </div>
            <div style="font-size: 10px; color: #555;">${biome.desc}</div>
            <hr border="1" color="#222" style="margin: 8px 0;">
            <div style="font-size: 11px;">
                S: +${planet.scrapPerTick.toFixed(2)} | E: +${planet.energyPerTick.toFixed(2)} | D: +${planet.dataPerTick.toFixed(2)}
            </div>
            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="buildModule('${planet.id}', 'extractor')">EXTRACTOR (${extractCost}S)</button>
                <button onclick="buildModule('${planet.id}', 'solarArray')">SOLAR (${solarCost}S)</button>
                <button onclick="buildModule('${planet.id}', 'lab')" style="grid-column: span 2;">RESEARCH_LAB (${labCost}S)</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderResearch() {
    const container = document.getElementById('research-list');
    if(!container) return;

    container.innerHTML = `
        <button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled' : ''}>
            CRYO_PIPES (50D) - Frozen planets x2.5 Solar output
        </button>
        <button onclick="buyUpgrade('advancedDrills')">
            ADV_DRILLS (${100 + gameState.upgrades.advancedDrills * 50}D) - +10% Scrap Empire-wide
        </button>
        <button onclick="buyUpgrade('signalBoosters')">
            SIGNAL_BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50}D) - Cheaper Scanning
        </button>
    `;
}

// Initial Render
setInterval(gameLoop, 100);
