const crypto = require('crypto');

const RELIC_SLOTS = ['necklace', 'ring', 'earring', 'brooch', 'amulet'];
const RELIC_SETS = [
    { id: 'gladiators_resolve', name: "Gladiator's Resolve" },
    { id: 'mages_insight', name: "Mage's Insight" },
    { id: 'assassins_shadow', name: "Assassin's Shadow" },
    { id: 'paladins_grace', name: "Paladin's Grace" },
    { id: 'slime_kings_secret', name: "Slime King's Secret" }
];

// Full pool including flat and percent
const SUB_STATS_POOL = [
    'hp', 'atk', 'def', 'matk', 'mdef', 'spd', 
    'hp_percent', 'atk_percent', 'def_percent', 'matk_percent', 'mdef_percent', 
    'cr_rate', 'cd_mult'
];

const ROLL_RANGES = {
    cd_mult: { min: 0.05, max: 0.10 },
    cr_rate: { min: 0.03, max: 0.07 },
    atk_percent: { min: 0.04, max: 0.06 },
    matk_percent: { min: 0.04, max: 0.06 },
    hp_percent: { min: 0.06, max: 0.10 },
    def_percent: { min: 0.06, max: 0.10 },
    mdef_percent: { min: 0.06, max: 0.10 },
    hp: { min: 100, max: 150 },
    def: { min: 100, max: 150 },
    mdef: { min: 100, max: 150 },
    atk: { min: 50, max: 80 },
    matk: { min: 50, max: 80 },
    spd: { min: 1, max: 3 }
};

const PERCENT_POOL = [
    { stat: 'hp_percent', base: 0.08, increment: 0.024 },
    { stat: 'atk_percent', base: 0.08, increment: 0.024 },
    { stat: 'def_percent', base: 0.08, increment: 0.024 },
    { stat: 'matk_percent', base: 0.08, increment: 0.024 },
    { stat: 'mdef_percent', base: 0.08, increment: 0.024 }
];

const SLOT_CONFIG = {
    necklace: { stat: 'hp', base: 500, increment: 250, isPercent: false },
    ring: { stat: 'atk_matk', base: 30, increment: 18, isPercent: false },
    earring: { pool: [{ stat: 'energy_regen', base: 0.03, increment: 0.03 }, ...PERCENT_POOL] },
    brooch: { pool: [{ stat: 'cr_rate', base: 0.04, increment: 0.016 }, { stat: 'cd_mult', base: 0.05, increment: 0.03 }, ...PERCENT_POOL] },
    amulet: { pool: [{ stat: 'spd', base: 2, increment: 1.2 }, ...PERCENT_POOL] }
};

function getRandomRoll(stat) {
    const range = ROLL_RANGES[stat];
    if (!range) return 0;
    const val = Math.random() * (range.max - range.min) + range.min;
    return stat.includes('percent') || stat === 'cr_rate' || stat === 'cd_mult' 
        ? parseFloat(val.toFixed(3)) 
        : Math.floor(val);
}

function generateRandomRelic(enemyLevel, rarityStars = 3) {
    const slot = RELIC_SLOTS[Math.floor(Math.random() * RELIC_SLOTS.length)];
    const set = RELIC_SETS[Math.floor(Math.random() * RELIC_SETS.length)];
    const config = SLOT_CONFIG[slot];
    
    let mainStat;
    if (config.pool) {
        const selected = config.pool[Math.floor(Math.random() * config.pool.length)];
        mainStat = { stat: selected.stat, value: selected.base };
    } else {
        mainStat = { stat: config.stat, value: config.base };
    }
    
    const subStats = [];
    const usedSubs = new Set();
    const startingSubs = Math.max(0, rarityStars - 2);
    
    for (let i = 0; i < startingSubs; i++) {
        let sub;
        do {
            sub = SUB_STATS_POOL[Math.floor(Math.random() * SUB_STATS_POOL.length)];
        } while (
            usedSubs.has(sub) || 
            sub === mainStat.stat || 
            (mainStat.stat.includes(sub) && mainStat.stat.includes('percent')) ||
            (mainStat.stat === 'atk_matk' && (sub === 'atk' || sub === 'matk'))
        );
        usedSubs.add(sub);
        subStats.push({ stat: sub, value: getRandomRoll(sub) });
    }

    return {
        instanceId: crypto.randomUUID(),
        name: `${set.name} ${slot.charAt(0).toUpperCase() + slot.slice(1)}`,
        setId: set.id,
        slot: slot,
        stars: rarityStars,
        level: 0, 
        mainStat: mainStat,
        subStats: subStats,
        isEquipped: false,
        acquiredDate: new Date()
    };
}

function getRelicSetCounts(user) {
    const relicSetCounts = {};
    if (!user.relicEquipment) return relicSetCounts;
    const relicEntries = user.relicEquipment instanceof Map ? user.relicEquipment.entries() : Object.entries(user.relicEquipment);
    for (const [slot, instanceId] of relicEntries) {
        if (!instanceId) continue;
        const relic = user.relicInventory.find(r => r.instanceId === instanceId);
        if (relic) relicSetCounts[relic.setId] = (relicSetCounts[relic.setId] || 0) + 1;
    }
    return relicSetCounts;
}

function getSetBonusDescription(setId, count) {
    const bonuses = [];
    if (count >= 2) {
        if (setId === 'gladiators_resolve') bonuses.push('**2-Pc:** +18% ATK');
        else if (setId === 'mages_insight') bonuses.push('**2-Pc:** +18% MATK');
        else if (setId === 'assassins_shadow') bonuses.push('**2-Pc:** +10 SPD');
        else if (setId === 'paladins_grace') bonuses.push('**2-Pc:** +20% MDEF');
        else if (setId === 'slime_kings_secret') bonuses.push('**2-Pc:** +100 Max HP');
    }
    if (count >= 4) {
        if (setId === 'gladiators_resolve') bonuses.push('**4-Pc:** +15% ATK');
        else if (setId === 'mages_insight') bonuses.push('**4-Pc:** +15% MATK');
        else if (setId === 'assassins_shadow') bonuses.push('**4-Pc:** +15% Crit Rate');
        else if (setId === 'paladins_grace') bonuses.push('**4-Pc:** +20% DEF');
        else if (setId === 'slime_kings_secret') bonuses.push('**4-Pc:** +200 Max HP');
    }
    return bonuses;
}

module.exports = { 
    generateRandomRelic, 
    RELIC_SLOTS, 
    RELIC_SETS, 
    getRelicSetCounts, 
    getSetBonusDescription,
    SLOT_CONFIG,
    SUB_STATS_POOL,
    getRandomRoll
};