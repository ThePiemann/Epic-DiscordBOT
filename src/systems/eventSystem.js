const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SLOT_CONFIG, RELIC_SETS, generateRandomRelic } = require('../utils/relicUtils');

const EVENTS = {
    MERCHANT: 'merchant',
    CACHE: 'cache',
    SHRINE: 'shrine'
};

async function triggerRandomEvent(interaction, user) {
    const roll = Math.random();
    
    if (roll < 0.4) return triggerMerchant(interaction, user);
    if (roll < 0.7) return triggerCache(interaction, user);
    return triggerShrine(interaction, user);
}

async function triggerMerchant(interaction, user) {
    // Generate 3 random relics for sale at a discount
    const offers = [];
    for (let i = 0; i < 3; i++) {
        const relic = generateRandomRelic(user.level, 3 + Math.floor(Math.random() * 3));
        const price = (relic.stars * 1000) + 500;
        offers.push({ relic, price });
    }

    // Temporarily store offers in a way we can retrieve them (for this demo, we'll use a global map or just buttons)
    // In a real system, you might want to save this to the user doc temporarily.
    
    const embed = new EmbedBuilder()
        .setTitle('📦 Traveling Merchant')
        .setDescription('A mysterious traveler unfolds their pack. "Rare mystical artifacts, only for today!"')
        .setColor('#f1c40f');

    offers.forEach((off, idx) => {
        embed.addFields({
            name: `Offer ${idx + 1}: ${off.relic.name} (${off.relic.stars}⭐)`,
            value: `💰 **Price:** ${off.price} Gold
Main Stat: ${off.relic.mainStat.stat.toUpperCase()}`,
            inline: false
        });
    });

    // For simplicity in CLI, we won't implement the full buy logic here yet, 
    // but the UI is ready.
    return embed;
}

async function triggerCache(interaction, user) {
    const goldFound = 500 + Math.floor(Math.random() * 1000);
    user.gold += goldFound;
    await user.save();

    return new EmbedBuilder()
        .setTitle('🎁 Hidden Cache Found!')
        .setDescription(`You found a sturdy chest hidden behind some rocks!

💰 **Reward:** ${goldFound} Gold`)
        .setColor('#2ecc71');
}

async function triggerShrine(interaction, user) {
    const buffs = [
        { id: 'shrine_atk', name: 'Altar Blessing (ATK)', stat: 'atk', value: 0.10, type: 'percent', durationBattles: 5 },
        { id: 'shrine_def', name: 'Altar Blessing (DEF)', stat: 'def', value: 0.10, type: 'percent', durationBattles: 5 },
        { id: 'shrine_spd', name: 'Altar Blessing (SPD)', stat: 'spd', value: 5, type: 'flat', durationBattles: 5 }
    ];

    const buff = buffs[Math.floor(Math.random() * buffs.length)];
    
    // Apply Buff
    const existingIdx = user.buffs.findIndex(b => b.id === buff.id);
    if (existingIdx !== -1) user.buffs[existingIdx] = buff;
    else user.buffs.push(buff);
    
    await user.save();

    return new EmbedBuilder()
        .setTitle('⛩️ Ancient Shrine')
        .setDescription(`You offer a silent prayer at a weathered altar. You feel a surge of power!

✨ **Buff Received:** ${buff.name} (+5 Battles)`)
        .setColor('#3498db');
}

module.exports = { triggerRandomEvent, EVENTS };