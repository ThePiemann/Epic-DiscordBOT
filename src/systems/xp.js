const getNextLevelExp = (level) => {
    // Defines the required XP to go from the current level to the next.
    // Nerfed Progression: Slower curve to account for multi-source power.

    if (level <= 10) {
        // Levels 1-10: (e.g., L1 -> L2 requires 150 XP)
        return (100 * level) + 50; 
    } else if (level <= 30) {
        // Levels 11-30: significantly steeper
        return (250 * level) - 1000;
    } else {
        // Levels 31+: hard progression
        return (500 * level) - 7500;
    }
};

const getNextClassLevelExp = (level) => {
    // Class leveling is slower now
    return (75 * level) + 75; 
};

// Base XP ranges for activities
const ACTIVITY_XP = {
    craft: { min: 5, max: 15 },
    brew: { min: 5, max: 15 },
    fish: { min: 5, max: 10 },
    mine: { min: 5, max: 10 },
    forage: { min: 3, max: 8 },
    chop: { min: 3, max: 8 },
    default: { min: 1, max: 5 }
};

/**
 * Calculates and awards XP for a specific activity, applying potential class bonuses.
 * @param {Object} user - The user document
 * @param {String} activityType - The type of activity (e.g., 'craft', 'fish')
 * @returns {Promise<{xpAmount: Number, summary: Object}>} The amount of XP awarded and the level up summary
 */
async function addActivityXp(user, activityType) {
    // 1. Determine Base Range
    const range = ACTIVITY_XP[activityType] || ACTIVITY_XP.default;
    
    // 2. Roll for Base XP
    let xpAmount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

    // 4. Award XP (Lazy import to avoid circular dependency)
    const { addExperience } = require('./leveling');
    
    const summary = await addExperience(user, xpAmount, 'player');

    return { xpAmount, summary };
}

module.exports = {
    getNextLevelExp,
    getNextClassLevelExp,
    addActivityXp,
    ACTIVITY_XP
};