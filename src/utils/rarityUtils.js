const RARITIES = {
    Common: { name: 'Common', color: '#ffffff', multiplier: 1.0, chance: 0.60 },
    Uncommon: { name: 'Uncommon', color: '#1eff00', multiplier: 1.2, chance: 0.25 },
    Rare: { name: 'Rare', color: '#0070dd', multiplier: 1.5, chance: 0.10 },
    Epic: { name: 'Epic', color: '#a335ee', multiplier: 2.0, chance: 0.04 },
    Legendary: { name: 'Legendary', color: '#ff8000', multiplier: 3.0, chance: 0.01 },
};

const RARITY_PREFIXES = {
    Common: [],
    Uncommon: ['Sturdy', 'Polished', 'Reliable', 'Balanced'],
    Rare: ['Refined', 'Exquisite', 'Superior', 'Reinforced', 'Gleaming'],
    Epic: ['Ancient', 'Heroic', 'Majestic', 'Grand', 'Vanquisher\'s'],
    Legendary: ['Mythic', 'Eternal', 'Divine', 'God-Slayer', 'Calamity', 'Absolute']
};

/**
 * Generates a quality-sounding name based on rarity.
 * @param {string} baseName - The original item name.
 * @param {string} rarity - The rarity tier.
 * @returns {string} The new formatted name.
 */
function generateQualityName(baseName, rarity) {
    const prefixes = RARITY_PREFIXES[rarity] || [];
    if (prefixes.length === 0) return baseName;
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix} ${baseName}`;
}

/**
 * Rolls for a random rarity based on predefined chances.
 * @returns {string} The rarity name.
 */
function rollRarity() {
    const roll = Math.random();
    let cumulativeChance = 0;
    
    // Sort rarities by chance ascending or use a fixed order (Legendary first is safer for roll)
    const order = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
    
    for (const r of order) {
        cumulativeChance += RARITIES[r].chance;
        if (roll < cumulativeChance) return r;
    }
    
    return 'Common';
}

/**
 * Rolls for stars (1-3).
 * @param {number} bonus - Optional bonus to the roll (e.g. from elite enemies)
 * @returns {number} 1, 2, or 3 stars.
 */
function rollStars(bonus = 0) {
    const roll = Math.random() + bonus;
    if (roll > 0.95) return 3;
    if (roll > 0.70) return 2;
    return 1;
}

/**
 * Generates random stats for an item based on its base stats, rarity, and stars.
 * @param {Object} baseStats - The item's base stats from its definition.
 * @param {string} rarityName - The rarity of the item.
 * @param {number} stars - The star level (1-3).
 * @returns {Object} The generated stats.
 */
function generateRandomStats(baseStats, rarityName, stars = 1) {
    const rarity = RARITIES[rarityName] || RARITIES.Common;
    const stats = {};
    
    // Star Multiplier: 1 star = 1.0x, 2 stars = 1.2x, 3 stars = 1.5x
    const starMult = 1 + (stars - 1) * 0.25;

    for (const [stat, value] of Object.entries(baseStats)) {
        if (typeof value !== 'number') continue;
        
        // Base * Rarity Multiplier * Star Multiplier * Random variance (0.9 to 1.1)
        const variance = 0.9 + (Math.random() * 0.2);
        stats[stat] = Math.floor(value * rarity.multiplier * starMult * variance);
        
        // Ensure some stats don't become 0 if they had a base value
        if (value > 0 && stats[stat] <= 0) stats[stat] = 1;
    }
    
    return stats;
}

const POTENTIAL_AFFIXES = [
    { id: 'sharp', name: 'Sharp', stat: 'atk', value: 5, type: 'percent', slots: ['weapon'] },
    { id: 'sturdy', name: 'Sturdy', stat: 'def', value: 8, type: 'percent', slots: ['chest', 'head', 'legs', 'feet'] },
    { id: 'arcane', name: 'Arcane', stat: 'matk', value: 10, type: 'percent', slots: ['weapon'] },
    { id: 'mystic', name: 'Mystic', stat: 'mdef', value: 10, type: 'percent', slots: ['chest', 'head', 'legs', 'feet'] },
    { id: 'healthy', name: 'Healthy', stat: 'hp', value: 50, type: 'flat', slots: ['chest', 'head', 'legs', 'feet', 'accessory'] },
    { id: 'fleet', name: 'Fleet', stat: 'spd', value: 5, type: 'flat', slots: ['feet', 'accessory'] },
    { id: 'deadly', name: 'Deadly', stat: 'cr_rate', value: 0.05, type: 'flat', slots: ['weapon', 'accessory'] },
    { id: 'brutal', name: 'Brutal', stat: 'cd_mult', value: 0.2, type: 'flat', slots: ['weapon', 'accessory'] },
];

/**
 * Generates random affixes for an item based on its rarity and slot.
 * @param {string} rarityName - The rarity of the item.
 * @param {string} slot - The equipment slot (weapon, chest, etc.)
 * @returns {Array} Array of affix objects.
 */
function generateRandomAffixes(rarityName, slot) {
    const rarityToCount = {
        'Common': 0,
        'Uncommon': 1,
        'Rare': 2,
        'Epic': 3,
        'Legendary': 4
    };

    const count = rarityToCount[rarityName] || 0;
    if (count === 0) return [];

    const available = POTENTIAL_AFFIXES.filter(a => a.slots.includes(slot) || a.slots.includes('accessory'));
    const affixes = [];
    const usedIds = new Set();

    for (let i = 0; i < count; i++) {
        const pool = available.filter(a => !usedIds.has(a.id));
        if (pool.length === 0) break;

        const picked = pool[Math.floor(Math.random() * pool.length)];
        usedIds.add(picked.id);
        
        // Add some random variance to the affix value
        const variance = 0.8 + (Math.random() * 0.4);
        affixes.push({
            ...picked,
            value: picked.type === 'percent' ? Math.round(picked.value * variance) : picked.value // Flat values kept simple for now
        });
    }

    return affixes;
}

module.exports = {
    RARITIES,
    rollRarity,
    generateRandomStats,
    generateRandomAffixes
};