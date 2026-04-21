// --- INITIAL STATE ---
let gameState = {
    energy: 100, scrap: 20, data: 0,
    colonists: 0, maxColonists: 5,
    freighters: 0, activeRoutes: 0,
    planets: [], sectors: [],
    scanCost: 10, maxPlanets: 3,
    upgrades: { cryoPipes: false, advancedDrills: 0, signalBoosters: 0 },
    megaStage: 0, megaProgress: 0,
    eventLog: [], lastTick: Date.now()
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

// --- PERSISTENCE ---
function saveToLocal() { localStorage.setItem('orbitalCommandSave', JSON.stringify(gameState)); logMessage("SYSTEM: DATA_BACKUP_SUCCESSFUL."); }
function loadFromLocal() {
    const d = localStorage.getItem('orbitalCommandSave');
    if (d) { gameState = JSON.parse(d); renderPlanets(); renderResearch(); renderMega(); updateUI(); logMessage("SYSTEM: DATA_RESTORED."); }
}
function exportSave() { window.prompt("COPY_SAVE_CODE:", btoa(JSON.stringify(gameState))); }
function importSave() { 
    const s = window.prompt("PASTE_SAVE_CODE:");
    if (s) { gameState = JSON.parse(atob(s)); saveToLocal(); location.reload(); }
}

// --- LOGIC ---
function logMessage(m) { gameState.eventLog.unshift(`[${new Date().toLocaleTimeString()}] ${m}`); if(gameState.eventLog.length > 8) gameState.eventLog.pop(); renderLog(); }

function manualScan() {
    if (gameState.planets.length >= gameState.maxPlanets) { logMessage("CRITICAL: COMMAND_CAPACITY_REACHED."); return; }
    if (gameState.energy >= gameState.scanCost) {
        gameState.energy -= gameState.scanCost;
        const curSec = gameState.sectors[gameState.sectors.length - 1];
        if (!curSec || curSec.planets.length >= 2) { createSector(); } else { discoverPlanet(curSec.id); }
        gameState.scanCost = Math.floor(gameState.scanCost * (1.6 - (gameState.upgrades.signalBoosters * 0.05)));
        updateUI();
    }
}

function createSector() {
    const types = Object.keys(SECTOR_TYPES);
    const t = types[Math.floor(Math.random() * types.length)];
    const id = "SEC-" + Math.floor(Math.random() * 99);
    gameState.sectors.push({ id, type: t, planets: [] });
    logMessage(`SYSTEM: ENTERED ${id} (${t}).`);
    discoverPlanet(id);
}

function discoverPlanet(sId) {
    const pId = Math.random().toString(36).substr(2, 9);
    const t = Object.keys(BIOMES)[Math.floor(Math.random() * 5)];
    const n = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}-${Math.floor(Math.random() * 999)}`;
    gameState.planets.push({ id: pId, name: n, type: t, sectorId: sId, assignedWorkers: 0, isExporting: false, specialization: "NONE", modules: { extractor: 0, solarArray: 0, lab: 0, hab: 0 }});
    gameState.sectors.find(s => s.id === sId).planets.push(pId);
    renderPlanets();
}

function recruitColonist() {
    const c = 20 + (gameState.colonists * 10);
    if (gameState.scrap >= c && gameState.colonists < gameState.maxColonists) { gameState.scrap -= c; gameState.colonists++; updateUI(); }
}

function buildFreighter() {
    const c = 50 + (gameState.freighters * 25);
    if (gameState.scrap >= c) { gameState.scrap -= c; gameState.freighters++; updateUI(); }
}

function upgradeCommand() {
    const c = Math.pow(gameState.maxPlanets, 2) * 25;
    if (gameState.scrap >= c) { gameState.scrap -= c; gameState.maxPlanets++; updateUI(); }
}

function buildModule(pId, mType) {
    const p = gameState.planets.find(x => x.id === pId);
    let c = (mType === 'lab' ? 50 : mType === 'hab' ? 30 : 10) + (p.modules[mType] * 15);
    if (gameState.scrap >= c) { gameState.scrap -= c; p.modules[mType]++; if(mType === 'hab') gameState.maxColonists += 5; updateUI(); renderPlanets(); }
}

function assignWorker(pId, amt) {
    const p = gameState.planets.find(x => x.id === pId);
    const total = gameState.planets.reduce((s, x) => s + x.assignedWorkers, 0);
    if (amt > 0 && total < gameState.colonists) p.assignedWorkers++;
    else if (amt < 0 && p.assignedWorkers > 0) p.assignedWorkers--;
    renderPlanets(); updateUI();
}

function specializePlanet(pId, sType) {
    const p = gameState.planets.find(x => x.id === pId);
    if (gameState.data >= 250) { gameState.data -= 250; p.specialization = sType; renderPlanets(); updateUI(); }
}

function toggleTrade(pId) {
    const p = gameState.planets.find(x => x.id === pId);
    if (!p.isExporting && gameState.activeRoutes < gameState.freighters) { p.isExporting = true; gameState.activeRoutes++; }
    else if (p.isExporting) { p.isExporting = false; gameState.activeRoutes--; }
    renderPlanets(); updateUI();
}

function contributeToMega() {
    const s = MEGA_STAGES[gameState.megaStage];
    if (gameState.scrap >= s.scrap/10 && gameState.data >= s.data/10 && gameState.energy >= s.energy/10) {
        gameState.scrap -= s.scrap/10; gameState.data -= s.data/10; gameState.energy -= s.energy/10;
        gameState.megaProgress += 10;
        if (gameState.megaProgress >= 100) { gameState.megaProgress = 0; gameState.megaStage++; logMessage(`MEGA: ${MEGA_STAGES[gameState.megaStage-1].name} ONLINE.`); }
        updateUI(); renderMega();
    }
}

function buyUpgrade(t) {
    const c = { cryoPipes: 50, advancedDrills: 100, signalBoosters: 75 }[t] + (t !== 'cryoPipes' ? gameState.upgrades[t] * 50 : 0);
    if (gameState.data >= c) { gameState.data -= c; if(t === 'cryoPipes') gameState.upgrades.cryoPipes = true; else gameState.upgrades[t]++; renderResearch(); updateUI(); }
}

// --- MAIN ENGINE ---
function gameLoop() {
    gameState.planets.forEach(p => {
        const sec = gameState.sectors.find(s => s.id === p.sectorId);
        const sM = SECTOR_TYPES[sec.type];
        const bM = BIOMES[p.type];
        const sp = SPECIALIZATIONS[p.specialization];
        const totalMod = p.modules.extractor + p.modules.solarArray + p.modules.lab;
        let eff = totalMod > 0 ? Math.min(1, 0.1 + (p.assignedWorkers / totalMod)) : 0.1;

        gameState.scrap += (p.modules.extractor * 0.25 * bM.scrap * (1 + gameState.upgrades.advancedDrills * 0.1) * sp.scrap * sM.scrap * eff / 10);
        let eGain = (p.modules.solarArray * 0.4 * bM.energy * (p.type === "Frozen" && gameState.upgrades.cryoPipes ? 2.5 : 1) * sp.energy * sM.energy * eff / 10);
        if (gameState.megaStage >= 3) eGain *= 100;
        gameState.energy += eGain;
        gameState.data += (p.modules.lab * 0.1 * sp.data * sM.data * eff / 10);

        let dM = (gameState.megaStage < 3 && gameState.megaProgress > 0) ? 1.25 : 1.0; 
        if (p.assignedWorkers > 0) gameState.energy -= (p.assignedWorkers * 0.1 * bM.oxygenCost * dM / 10);
        if (p.isExporting) gameState.energy -= (0.2 * dM / 10); 
    });
    gameState.energy += 0.05;
    if (Math.random() < 0.005) { /* Anomalies logic can go here */ }
    if (Math.random() < 0.01) saveToLocal();
    updateUI();
}

// --- RENDERERS ---
function updateUI() {
    document.getElementById('energy-display').innerText = Math.floor(gameState.energy);
    document.getElementById('scrap-display').innerText = Math.floor(gameState.scrap);
    document.getElementById('data-display').innerText = Math.floor(gameState.data);
    document.getElementById('pop-display').innerText = `${gameState.colonists}/${gameState.maxColonists}`;
    document.getElementById('ship-display').innerText = `${gameState.activeRoutes}/${gameState.freighters}`;
    document.getElementById('colony-display').innerText = `${gameState.planets.length}/${gameState.maxPlanets}`;
    document.getElementById('unassigned-display').innerText = gameState.colonists - gameState.planets.reduce((s, p) => s + p.assignedWorkers, 0);
    document.getElementById('btn-scan').innerText = `[ SCAN ] (${gameState.scanCost}E)`;
    document.getElementById('btn-recruit').innerText = `[ RECRUIT ] (${20 + (gameState.colonists * 10)}S)`;
    document.getElementById('btn-freighter').innerText = `[ FREIGHTER ] (${50 + (gameState.freighters * 25)}S)`;
    document.getElementById('btn-command').innerText = `[ EXPAND_COMMAND ] (${Math.pow(gameState.maxPlanets, 2) * 25}S)`;
}

function renderPlanets() {
    const list = document.getElementById('planet-list'); list.innerHTML = '';
    gameState.sectors.forEach(s => {
        const sM = SECTOR_TYPES[s.type];
        const h = document.createElement('div'); h.className = 'sector-header'; h.style.borderLeft = `4px solid ${sM.color}`;
        h.innerHTML = `<strong style="color:${sM.color}">${s.id} // ${s.type}</strong><br><small style="color:#666">${sM.desc}</small>`;
        list.appendChild(h);
        gameState.planets.filter(p => p.sectorId === s.id).forEach(p => {
            const b = BIOMES[p.type]; const card = document.createElement('div'); card.className = 'planet-card';
            const tot = p.modules.extractor + p.modules.solarArray + p.modules.lab + p.modules.hab;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between"><strong>${p.name}</strong><span style="color:#00ff41">[${p.specialization !== 'NONE' ? p.specialization : p.type.toUpperCase()}]</span></div>
                <div style="font-size:10px; color:#555">${b.desc} | WORKERS: ${p.assignedWorkers}</div>
                <div style="margin:8px 0; display:flex; justify-content:space-between">
                    <div><button onclick="assignWorker('${p.id}', 1)">+W</button><button onclick="assignWorker('${p.id}', -1)">-W</button></div>
                    <button onclick="toggleTrade('${p.id}')" style="background:${p.isExporting ? '#00ff41':'transparent'}; color:${p.isExporting ? '#000':'#00ff41'}">${p.isExporting ? '[EXPORTING]':'[TRADE]'}</button>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px">
                    <button onclick="buildModule('${p.id}', 'extractor')">EXTR [${p.modules.extractor}] (${10 + p.modules.extractor * 15}S)</button>
                    <button onclick="buildModule('${p.id}', 'solarArray')">SOLR [${p.modules.solarArray}] (${10 + p.modules.solarArray * 15}S)</button>
                    <button onclick="buildModule('${p.id}', 'lab')">LAB [${p.modules.lab}] (${50 + p.modules.lab * 15}S)</button>
                    <button onclick="buildModule('${p.id}', 'hab')">HAB [${p.modules.hab}] (${30 + p.modules.hab * 15}S)</button>
                </div>
                ${tot >= 5 && p.specialization === "NONE" ? `<div class="spec-box"><small>SPECIALIZE (250D)</small><br><button onclick="specializePlanet('${p.id}','FORGE')">FORGE</button><button onclick="specializePlanet('${p.id}','POWER')">POWER</button><button onclick="specializePlanet('${p.id}','ARCHIVE')">ARCHIVE</button></div>` : ''}
            `;
            list.appendChild(card);
        });
    });
}

function renderMega() {
    const s = MEGA_STAGES[gameState.megaStage]; const c = document.getElementById('mega-section');
    if (gameState.megaStage >= 3) { c.innerHTML = `<h3 style="color:#00ff41">DYSON_SWARM_ONLINE</h3><small>Victory achieved.</small>`; return; }
    c.innerHTML = `<h3 style="color:#ffaa00">PROJECT: ${s.name}</h3><div style="background:#111; height:8px; margin-bottom:8px"><div style="background:#ffaa00; height:100%; width:${gameState.megaProgress}%"></div></div>
    <button onclick="contributeToMega()" style="width:100%; border-color:#ffaa00; color:#ffaa00;">BUILD (${s.scrap/10}S, ${s.data/10}D, ${s.energy/10}E)</button>`;
}

function renderLog() { document.getElementById('event-log').innerHTML = gameState.eventLog.join('<br>'); }
function renderResearch() {
    const r = document.getElementById('research-list');
    r.innerHTML = `<button onclick="buyUpgrade('cryoPipes')" ${gameState.upgrades.cryoPipes ? 'disabled':''}>CRYO_PIPES (50D)</button>
    <button onclick="buyUpgrade('advancedDrills')">DRILLS (${100 + gameState.upgrades.advancedDrills * 50}D)</button>
    <button onclick="buyUpgrade('signalBoosters')">BOOSTERS (${75 + gameState.upgrades.signalBoosters * 50}D)</button>`;
}

window.onload = () => { loadFromLocal(); setInterval(gameLoop, 100); renderResearch(); renderMega(); };
