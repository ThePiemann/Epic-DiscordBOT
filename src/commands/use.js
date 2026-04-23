const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems'); 
const { calculateEffectiveStats } = require('../systems/stats'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use a consumable item from your inventory.')
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('The ID of the item to use (e.g., small_potion)')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('The number of times to use the item (default: 1)')
                .setRequired(false)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const user = await User.findOne({ userId: interaction.user.id }).select('inventory').lean();
        if (!user || !user.inventory) return interaction.respond([]);

        const choices = [];
        const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);

        for (const [itemId, qty] of inventoryEntries) {
            const item = MASTER_ITEM_MAP[itemId];
            if (item && item.type === 'consumable') {
                if (item.name.toLowerCase().includes(focusedValue) || itemId.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `${item.name} (x${qty})`, value: itemId });
                }
            }
        }

        await interaction.respond(choices.slice(0, 25));
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
            return interaction.editReply('Use `/start` to create a character first!');
        }

        const itemId = interaction.options.getString('item_id').toLowerCase();
        const amountToUse = interaction.options.getInteger('amount') || 1;

        if (amountToUse < 1) {
            return interaction.editReply('You must use at least 1 item.');
        }

        const itemData = MASTER_ITEM_MAP[itemId];
        if (!itemData) {
            return interaction.editReply(`Item ID \`${itemId}\` is not a recognized item.`);
        }

        if (itemData.type !== 'consumable') {
            return interaction.editReply(`You cannot use **${itemData.name}**. It is a **${itemData.type}**.`);
        }

        const userItemCount = user.inventory.get(itemId) || 0;
        if (userItemCount < amountToUse) {
            return interaction.editReply(`You only have ${userItemCount}x **${itemData.name}** in your inventory.`);
        }

        // --- Apply Effects ---
        const effectiveStats = calculateEffectiveStats(user);
        
        // 🕒 Process Regeneration
        user.processRegen(effectiveStats);
        
        let totalHealed = 0;
        let totalManaRestored = 0;
        let totalStaminaRestored = 0;
        let successCount = 0;
        let buffApplied = null;

        for (let i = 0; i < amountToUse; i++) {
            let used = false;

            // 1. RESTORE EFFECTS
            if (itemData.effect) {
                if (itemData.effect.hp_restore) {
                    const maxHp = effectiveStats.maxHp;
                    if (user.stats.hp < maxHp) {
                        const restore = itemData.effect.hp_restore;
                        const newHp = Math.min(user.stats.hp + restore, maxHp);
                        totalHealed += (newHp - user.stats.hp);
                        user.stats.hp = newHp;
                        used = true;
                    }
                }

                if (itemData.effect.mana_restore) {
                    const maxMana = effectiveStats.maxMana; 
                    if (user.stats.mana < maxMana) {
                        const restore = itemData.effect.mana_restore;
                        const newMana = Math.min(user.stats.mana + restore, maxMana);
                        totalManaRestored += (newMana - user.stats.mana);
                        user.stats.mana = newMana;
                        used = true;
                    }
                }

                if (itemData.effect.stamina_restore) {
                    const maxStamina = effectiveStats.maxStamina;
                    if (user.stats.stamina < maxStamina) {
                        const restore = itemData.effect.stamina_restore;
                        const newStamina = Math.min(user.stats.stamina + restore, maxStamina);
                        totalStaminaRestored += (newStamina - user.stats.stamina);
                        user.stats.stamina = newStamina;
                        used = true;
                    }
                }

                // 2. BUFF EFFECTS
                if (itemData.effect.buff) {
                    // Check if already has this buff
                    const existingIdx = user.buffs.findIndex(b => b.id === itemData.effect.buff.id);
                    const bConfig = itemData.effect.buff;
                    
                    const newBuff = {
                        id: bConfig.id,
                        name: bConfig.name,
                        stat: bConfig.stat,
                        value: bConfig.value,
                        type: bConfig.type,
                        durationBattles: bConfig.durationBattles || 0,
                        expiresAt: bConfig.expiresAt ? new Date(Date.now() + bConfig.expiresAt) : null
                    };

                    if (existingIdx !== -1) {
                        // Refresh duration
                        user.buffs[existingIdx] = newBuff;
                    } else {
                        user.buffs.push(newBuff);
                    }
                    buffApplied = bConfig.name;
                    used = true;
                }
            }

            if (used) successCount++;
            else if (i === 0) break; // If first one failed (stats full), stop.
        }
        
        // Remove items
        if (successCount > 0) {
            user.removeItem(itemId, successCount);
        }

        await user.save();
        
        // Build Response
        if (successCount === 0) {
             return interaction.editReply(`❌ You didn't use **${itemData.name}** because your stats are already full!`);
        }

        let response = `✅ Used **${successCount}x ${itemData.name}**.`;
        if (totalHealed > 0) response += `\n❤️ HP: +${Math.floor(totalHealed)} (${Math.floor(user.stats.hp)}/${Math.floor(effectiveStats.maxHp)})`;
        if (totalManaRestored > 0) response += `\n💧 Mana: +${Math.floor(totalManaRestored)} (${Math.floor(user.stats.mana)}/${Math.floor(user.stats.maxMana)})`;
        if (totalStaminaRestored > 0) response += `\n⚡ Stamina: +${Math.floor(totalStaminaRestored)} (${Math.floor(user.stats.stamina)}/${Math.floor(user.stats.maxStamina)})`;
        if (buffApplied) response += `\n✨ Applied Buff: **${buffApplied}**!`;

        return interaction.editReply(response);
    }
};