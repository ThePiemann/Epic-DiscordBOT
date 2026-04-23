const { EmbedBuilder } = require('discord.js');
const { MASTER_ITEM_LIST, MASTER_ITEM_MAP } = require('../data/shopItems');
const REGIONS = require('../data/regions');

/**
 * Finds an item by ID or Name (fuzzy match).
 * @param {string} input - The item ID or Name to search for.
 * @param {Array} itemList - Optional override for item list (defaults to MASTER_ITEM_LIST).
 * @returns {Object|null} The item object or null if not found.
 */
function findItem(input, itemList = MASTER_ITEM_LIST) {
    if (!input) return null;
    const cleanInput = input.trim().toLowerCase();

    // 1. Direct ID match
    const mapMatch = MASTER_ITEM_MAP[cleanInput];
    if (mapMatch) return mapMatch;

    // 2. Exact Name match (case-insensitive)
    const exactNameMatch = MASTER_ITEM_LIST.find(i => i.name.toLowerCase() === cleanInput);
    if (exactNameMatch) return exactNameMatch;

    // 3. Partial Name match
    const startsWith = MASTER_ITEM_LIST.find(i => i.name.toLowerCase().startsWith(cleanInput));
    if (startsWith) return startsWith;

    const contains = MASTER_ITEM_LIST.find(i => i.name.toLowerCase().includes(cleanInput));
    if (contains) return contains;

    return null;
}

function findLocations(itemId) {
    const regionalFindings = {};

    for (const [regId, reg] of Object.entries(REGIONS)) {
        if (!reg.subRegions) continue;
        
        const findingsInThisRegion = [];
        
        for (const sub of reg.subRegions) {
            if (!sub.resources) continue;
            
            const activities = [];
            if (sub.resources.mine?.some(r => r.item === itemId)) activities.push('⛏️ Mining');
            if (sub.resources.forage?.some(r => r.item === itemId)) activities.push('🌿 Foraging');
            if (sub.resources.fish?.some(r => r.item === itemId)) activities.push('🎣 Fishing');
            if (sub.resources.search?.some(r => r.item === itemId)) activities.push('🔍 Searching');
            if (sub.resources.chop?.some(r => r.item === itemId)) activities.push('🪓 Chopping');

            if (activities.length > 0) {
                findingsInThisRegion.push(`• **${sub.name}** (${activities.join(', ')})`);
            }
        }

        if (findingsInThisRegion.length > 0) {
            regionalFindings[reg.name] = findingsInThisRegion;
        }
    }

    const output = [];
    for (const [regionName, subRegions] of Object.entries(regionalFindings)) {
        output.push(`📍 **${regionName}**\n${subRegions.join('\n')}`);
    }

    return output;
}

function getTypeEmoji(type) {
    const map = {
        'weapon': '⚔️', 'sword': '⚔️', 'staff': '🔮', 'bow': '🏹', 'dagger': '🗡️',
        'armor': '🛡️', 'chestplate': '👕', 'chest': '👕', 'head': '🧢', 'legs': '👖', 'feet': '👢',
        'potion': '🧪', 'consumable': '🧪',
        'material': '🪵', 'tool': '🛠️', 'pickaxe': '⛏️', 'axe': '🪓', 'rod': '🎣'
    };
    return map[type?.toLowerCase()] || '📦';
}

function getStars(count) {
    if (!count) return '';
    return '⭐'.repeat(count);
}

function formatValue(val) {
    if (!val) return 'N/A';
    return val.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getItemEmbed(item, user = null) {
    const rarityColors = {
        'common': '#95a5a6',
        'uncommon': '#2ecc71',
        'rare': '#3498db',
        'epic': '#9b59b6',
        'legendary': '#f1c40f',
        'mythic': '#e74c3c'
    };

    const embed = new EmbedBuilder()
        .setTitle(`${getTypeEmoji(item.type)} ${item.name} ${getStars(item.stars)}`)
        .setDescription(`*${item.description || 'No description provided.'}*`)
        .setColor(rarityColors[item.rarity?.toLowerCase()] || '#ffffff')
        .addFields(
            { name: '🆔 ID', value: `\`${item.id}\``, inline: true },
            { name: '📂 Type', value: formatValue(item.type), inline: true },
            { name: '💎 Rarity', value: formatValue(item.rarity), inline: true }
        );

    // --- Comparison Logic ---
    let equippedItem = null;
    if (user) {
        let slot = 'weapon';
        const type = item.type?.toLowerCase();
        if (type === 'helmet') slot = 'head';
        else if (type === 'chestplate' || type === 'armor') slot = 'chest';
        else if (type === 'leggings') slot = 'legs';
        else if (type === 'boots') slot = 'feet';
        else if (['weapon', 'sword', 'staff', 'bow', 'dagger'].includes(type)) slot = 'weapon';
        else slot = null;

        if (slot) {
            const equippedId = user.equipment.get(slot);
            if (equippedId) {
                equippedItem = MASTER_ITEM_MAP[equippedId] || user.uniqueInventory?.find(ui => ui.instanceId === equippedId);
            }
        }
    }

    const getComp = (newVal, oldVal, isPercent = false) => {
        if (oldVal === undefined || oldVal === null) return '';
        const diff = newVal - oldVal;
        if (diff === 0) return ' (=)';
        const sign = diff > 0 ? '+' : '';
        const display = isPercent ? (diff * 100).toFixed(1) + '%' : Math.floor(diff);
        return diff > 0 ? ` (**${sign}${display}** 🟢)` : ` (**${sign}${display}** 🔴)`;
    };

    // --- Where to Find ---
    const locs = findLocations(item.id);
    if (locs.length > 0) {
        embed.addFields({ name: '🌍 Found in Locations', value: locs.join('\n\n'), inline: false });
    }

    let statsList = [];
    if (item.baseAttack) {
        const comp = getComp(item.baseAttack, equippedItem?.baseAttack || 0);
        statsList.push(`Base ATK: **${item.baseAttack}**${comp}`);
    }
    if (item.baseDefense) {
        const comp = getComp(item.baseDefense, equippedItem?.baseDefense || 0);
        statsList.push(`Base DEF: **${item.baseDefense}**${comp}`);
    }
    if (item.efficiency) statsList.push(`Efficiency: **${item.efficiency}x**`);
    if (item.maxDurability) statsList.push(`Max Durability: **${item.maxDurability}**`);
    
    if (item.stats) {
        for (const [stat, val] of Object.entries(item.stats)) {
            const sign = val >= 0 ? '+' : '';
            const isPct = stat.endsWith('_percent') || stat === 'cr_rate' || stat === 'cd_mult';
            const unit = isPct ? '%' : '';
            const cleanStat = stat.replace('_percent', '').toUpperCase();
            const displayVal = unit === '%' ? (val * 100).toFixed(1) : val;
            
            // Try to find same stat on equipped
            let oldVal = 0;
            if (equippedItem?.stats) {
                oldVal = equippedItem.stats[stat] || 0;
            }

            const comp = getComp(val, oldVal, isPct);
            statsList.push(`${cleanStat}: **${sign}${displayVal}${unit}**${comp}`);
        }
    }

    if (statsList.length > 0) embed.addFields({ name: '📊 Stats', value: statsList.join('\n'), inline: false });

    if (item.recipe) {
        const recipeList = Object.entries(item.recipe).map(([ing, amt]) => {
            const ingItem = MASTER_ITEM_MAP[ing];
            return `• ${ingItem ? ingItem.name : formatValue(ing)} x${amt}`;
        });
        embed.addFields({ name: '📜 Recipe', value: recipeList.join('\n'), inline: false });
    }

    if (item.allowedClasses && item.allowedClasses.length > 0) {
        embed.addFields({ name: '🛡️ Allowed Classes', value: item.allowedClasses.map(c => formatValue(c)).join(', '), inline: false });
    }

    let ecoInfo = [];
    if (item.price) ecoInfo.push(`Buy: **${item.price}g**`);
    if (item.sellPrice) ecoInfo.push(`Sell: **${item.sellPrice}g**`);
    if (item.buyable === false) ecoInfo.push(`*Not buyable in shops*`);
    if (ecoInfo.length > 0) embed.addFields({ name: '💰 Economy', value: ecoInfo.join('\n'), inline: true });

    let availability = [];
    if (item.brewable) availability.push('🧪 **Brewable**');
    if (item.craftable) availability.push('🔨 **Craftable**');
    if (item.cookable) availability.push('🍳 **Cookable**');
    
    if (item.tradeable !== false) availability.push('🤝 **Tradable**');
    else availability.push('🚫 **Non-Tradable**');
    
    if (item.auctionable !== false) availability.push('⚖️ **Auctionable**');
    else availability.push('🚫 **Non-Auctionable**');

    if (availability.length > 0) {
        embed.addFields({ name: '✨ Availability', value: availability.join('\n'), inline: true });
    }

    let misc = [];
    if (item.passive) misc.push(`**Passive:** ${item.passive}`);
    if (item.scaling) misc.push(`**Scaling:** ${formatValue(item.scaling)}`);
    if (item.effect) {
        if (item.effect.hp_restore) misc.push(`**Heal:** ${item.effect.hp_restore} HP`);
        if (item.effect.mana_restore) misc.push(`**Mana:** ${item.effect.mana_restore} MP`);
        if (item.effect.stamina_restore) misc.push(`**Stamina:** ${item.effect.stamina_restore} SP`);
        if (item.effect.buff) misc.push(`**Buff:** ${item.effect.buff.name} (${item.effect.buff.durationBattles || 'Timed'} duration)`);
    }
    if (misc.length > 0) embed.addFields({ name: '📜 Extra Info', value: misc.join('\n'), inline: false });

    return embed;
}

/**
 * Reduces the durability of a tool and handles breakage.
 * @param {Object} user - The player's Mongoose document.
 * @param {Object} tool - The tool data from tools.js.
 * @param {number} cost - The durability cost to subtract.
 * @returns {Object} { currentDurability, toolBroke }
 */
function reduceToolDurability(user, tool, cost) {
    let currentDurability = user.toolDurability.get(tool.id);
    if (currentDurability === undefined) currentDurability = tool.maxDurability;

    currentDurability -= cost;
    let toolBroke = false;

    if (currentDurability <= 0) {
        toolBroke = true;
        user.removeItem(tool.id, 1);
        user.toolDurability.delete(tool.id);
        
        // If they still have another of the SAME tool, reset durability for the next one
        if (user.inventory.get(tool.id) > 0) {
            user.toolDurability.set(tool.id, tool.maxDurability);
        }
    } else {
        user.toolDurability.set(tool.id, currentDurability);
    }

    user.markModified('toolDurability');
    user.markModified('inventory');
    
    return { currentDurability, toolBroke };
}

module.exports = { 
    findItem, 
    reduceToolDurability,
    getItemEmbed,
    getTypeEmoji,
    findLocations,
    formatValue
};