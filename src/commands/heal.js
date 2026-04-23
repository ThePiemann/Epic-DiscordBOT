const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP, MASTER_ITEM_LIST } = require('../data/shopItems');
const { calculateEffectiveStats } = require('../systems/stats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heal')
        .setDescription('Automatically use your smallest health potion to recover HP.')
        .addStringOption(option =>
            option.setName('potion')
                .setDescription('Specific potion to use (optional)')
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const user = await User.findOne({ userId: interaction.user.id }).select('inventory').lean();
        if (!user || !user.inventory) return interaction.respond([]);

        const choices = [];
        const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);

        for (const [itemId, qty] of inventoryEntries) {
            const item = MASTER_ITEM_MAP[itemId];
            if (item && item.type === 'consumable' && item.effect && item.effect.hp_restore > 0) {
                if (item.name.toLowerCase().includes(focusedValue) || itemId.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `${item.name} (+${item.effect.hp_restore} HP) (x${qty})`, value: itemId });
                }
            }
        }

        await interaction.respond(choices.slice(0, 25));
    },

    async execute(interaction) {
        await interaction.deferReply();

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        const specificPotionId = interaction.options.getString('potion');
        const effectiveStats = calculateEffectiveStats(user);

        // 🕒 Process Regeneration first
        user.processRegen(effectiveStats);

        // Check if HP is already full
        if (user.stats.hp >= effectiveStats.maxHp) {
            // Ensure we save the regen updates even if we don't heal
            await user.save(); 
            return interaction.editReply('Your health is already full! ❤️');
        }

        let itemToUse = null;

        if (specificPotionId) {
            const item = MASTER_ITEM_MAP[specificPotionId.toLowerCase()];
            if (!item || !(user.inventory.get(item.id) > 0) || !item.effect?.hp_restore) {
                return interaction.editReply(`❌ You don't have **${specificPotionId}** or it's not a healing potion.`);
            }
            itemToUse = item;
        } else {
            // 1. Identify all healing items from the Master List
            const healingItems = MASTER_ITEM_LIST.filter(item => 
                item.type === 'consumable' && 
                item.effect && 
                item.effect.hp_restore > 0
            );

            // 2. Sort by heal amount (Ascending: Smallest potion first)
            healingItems.sort((a, b) => a.effect.hp_restore - b.effect.hp_restore);

            // 3. Find the first item that the user actually owns
            for (const item of healingItems) {
                if (user.inventory.get(item.id) > 0) {
                    itemToUse = item;
                    break; // Found the smallest available potion
                }
            }
        }

        if (!itemToUse) {
            return interaction.editReply('❌ You have no health potions in your inventory! Go buy some at the `/shop`.');
        }

        // 4. Use the item (Consume 1)
        const restoreAmount = itemToUse.effect.hp_restore;
        const currentHp = user.stats.hp;
        const maxHp = effectiveStats.maxHp;

        const newHp = Math.min(currentHp + restoreAmount, maxHp);
        const actualHealed = newHp - currentHp;

        user.stats.hp = newHp;
        user.removeItem(itemToUse.id, 1);
        
        await user.save();

        return interaction.editReply(`✅ You used **1x ${itemToUse.name}** and recovered **${actualHealed} HP**. \n❤️ Current HP: **${Math.floor(user.stats.hp)} / ${Math.floor(maxHp)}**`);
    }
};