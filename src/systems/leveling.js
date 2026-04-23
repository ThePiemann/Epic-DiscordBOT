const { calculateEffectiveStats } = require('./stats');
const { getNextLevelExp, getNextClassLevelExp } = require('./xp');

function getExpRequired(level) {
    return getNextLevelExp(level); 
}

function getClassExpRequired(level) {
    return getNextClassLevelExp(level);
}

/**
 * Adds experience to a user (Player XP and/or Class XP).
 * @param {Object} user - The user document
 * @param {Number} amount - Amount of XP to add
 * @param {String} type - 'player', 'class', or 'both' (default)
 */
async function addExperience(user, amount, type = 'both') {
    // Apply Global Boost
    try {
        const GlobalState = require('../models/GlobalState');
        const global = await GlobalState.findOne({ key: 'main' });
        if (global && global.boosts.xp > 1) {
            const isExpired = global.boosts.xp_expires && new Date() > global.boosts.xp_expires;
            if (!isExpired) {
                amount = Math.floor(amount * global.boosts.xp);
            }
        }
    } catch (e) {
        console.error('Failed to fetch global boosts:', e);
    }

    // 0. CAPTURE OLD STATS
    const oldStats = calculateEffectiveStats(user);

    let summary = {
        playerLevelsGained: 0,
        classLevelsGained: 0,
        playerExp: 0,
        classExp: 0,
        oldStats: oldStats,
        newStats: null
    };

    // --- PLAYER LEVELING ---
    if (type === 'player' || type === 'both') {
        user.exp += amount;
        
        // Increase fatigue (Tiredness)
        user.fatigue = Math.min(10, (user.fatigue || 0) + 1);

        while (true) {
            const req = getExpRequired(user.level);
            if (user.exp >= req) {
                user.exp -= req;
                user.level++;
                user.unspentPoints += 5; 
                summary.playerLevelsGained++;
            } else {
                break;
            }
        }
        summary.playerExp = amount;
    }

    // --- CLASS LEVELING ---
    const MAX_CLASS_LEVEL = 20;

    if (type === 'class' || type === 'both') {
        if (user.classLevel === undefined) user.classLevel = 1;
        if (user.classExp === undefined) user.classExp = 0;

        const wasMaxed = user.classLevel >= MAX_CLASS_LEVEL;

        if (!wasMaxed) {
            user.classExp += amount;
            while (user.classLevel < MAX_CLASS_LEVEL) {
                const req = getClassExpRequired(user.classLevel);
                if (user.classExp >= req) {
                    user.classExp -= req;
                    user.classLevel++;
                    summary.classLevelsGained++;
                } else {
                    break;
                }
            }
            summary.classExp = amount;
            
            if (user.classLevel >= MAX_CLASS_LEVEL) {
                summary.maxClassLevelReached = true;
                user.classExp = 0; 
            }
        } else {
            user.classExp = 0; 
            summary.classExp = 0; 
        }
    }

    // Refill stats on ANY level up
    if (summary.playerLevelsGained > 0 || summary.classLevelsGained > 0) {
        summary.newStats = calculateEffectiveStats(user);
        user.stats.hp = summary.newStats.maxHp;
        user.stats.mana = summary.newStats.maxMana;
        user.stats.stamina = summary.newStats.maxStamina;
        user.markModified('stats'); // Critical for Mongoose to save nested object changes
        console.log(`[Leveling] ${user.username} leveled up! Player: +${summary.playerLevelsGained}, Class: +${summary.classLevelsGained}`);
    }

    return summary;
}

module.exports = { getExpRequired, getClassExpRequired, addExperience };