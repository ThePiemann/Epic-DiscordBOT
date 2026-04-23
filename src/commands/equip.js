// src/commands/equip.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems'); 
const { advanceTutorial } = require('../utils/checks');

const getItemData = (itemId) => MASTER_ITEM_MAP[itemId];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('equip')
        .setDescription('Equip a weapon or piece of armor.')
        .addSubcommand(sub =>
            sub.setName('item')
                .setDescription('Equip a specific item by name or ID.')
                .addStringOption(option =>
                    option.setName('item_id')
                        .setDescription('The ID or Name of the item to equip.')
                        .setRequired(true)
                        .setAutocomplete(true))
        )
        .addSubcommand(sub =>
            sub.setName('best')
                .setDescription('Automatically equip the best gear in your inventory for your class.')
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        // Optimize: fetch only inventory fields, use lean
        const user = await User.findOne({ userId: interaction.user.id }).select('uniqueInventory inventory').lean();
        if (!user) return interaction.respond([]);

        const choices = [];
        const allowedTypes = ['weapon', 'armor', 'chestplate', 'helmet', 'boots', 'leggings', 'sword', 'staff', 'bow', 'dagger'];

        // 1. Check Unique Inventory (Items with stats/rarity)
        if (user.uniqueInventory) {
            user.uniqueInventory.forEach(item => {
                if (item.isEquipped) return;
                const itemData = MASTER_ITEM_MAP[item.itemId];
                if (itemData && allowedTypes.includes(itemData.type.toLowerCase())) {
                    if (item.name.toLowerCase().includes(focusedValue) || item.instanceId.toLowerCase().includes(focusedValue)) {
                        choices.push({ name: `⭐ ${item.name} (${item.rarity})`, value: item.instanceId });
                    }
                }
            });
        }

        // 2. Check Standard Inventory (Stackable equipment)
        if (user.inventory) {
            const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);
            for (const [itemId, qty] of inventoryEntries) {
                const itemData = MASTER_ITEM_MAP[itemId];
                if (itemData && allowedTypes.includes(itemData.type.toLowerCase())) {
                    if (itemData.name.toLowerCase().includes(focusedValue) || itemId.toLowerCase().includes(focusedValue)) {
                        choices.push({ name: `${itemData.name} (x${qty})`, value: itemId });
                    }
                }
            }
        }

        await interaction.respond(choices.slice(0, 25));
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const sub = interaction.options.getSubcommand();
        
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        if (sub === 'best') {
            const allowedTypes = ['weapon', 'armor', 'chestplate', 'helmet', 'boots', 'leggings', 'sword', 'staff', 'bow', 'dagger'];
            const allEquipment = [];

            // Gather all available equipment from inventory
            const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);
            for (const [itemId, qty] of inventoryEntries) {
                const itemData = MASTER_ITEM_MAP[itemId];
                if (itemData && allowedTypes.includes(itemData.type.toLowerCase()) && qty > 0) {
                    if (!itemData.allowedClasses || itemData.allowedClasses.includes(user.class)) {
                        allEquipment.push({ type: 'standard', data: itemData });
                    }
                }
            }

            // Gather all available unique equipment
            if (user.uniqueInventory) {
                user.uniqueInventory.forEach(ui => {
                    const itemData = MASTER_ITEM_MAP[ui.itemId];
                    if (itemData && allowedTypes.includes(itemData.type.toLowerCase())) {
                        if (!itemData.allowedClasses || itemData.allowedClasses.includes(user.class)) {
                            allEquipment.push({ type: 'unique', data: ui, base: itemData });
                        }
                    }
                });
            }

            const slots = {
                weapon: { score: -1, item: null, isUnique: false },
                head: { score: -1, item: null, isUnique: false },
                chest: { score: -1, item: null, isUnique: false },
                legs: { score: -1, item: null, isUnique: false },
                feet: { score: -1, item: null, isUnique: false }
            };

            allEquipment.forEach(eq => {
                let slot = 'weapon';
                const itemData = eq.type === 'unique' ? eq.base : eq.data;
                const type = itemData.type.toLowerCase();
                if (type === 'helmet') slot = 'head';
                else if (type === 'chestplate' || type === 'armor') slot = 'chest';
                else if (type === 'leggings') slot = 'legs';
                else if (type === 'boots') slot = 'feet';
                else slot = 'weapon';

                let score = 0;
                if (slot === 'weapon') {
                    score = itemData.baseAttack || 0;
                } else {
                    score = itemData.baseDefense || 0;
                }

                if (eq.type === 'unique') {
                    // Unique items get extra points for stats
                    if (eq.data.stats) {
                        score += (eq.data.stats.atk || 0) + (eq.data.stats.def || 0);
                    }
                    if (eq.data.affixes) {
                        score += eq.data.affixes.length * 5;
                    }
                    score += (eq.data.stars || 1) * 2;
                }

                if (score > slots[slot].score) {
                    slots[slot] = { score, item: eq, isUnique: eq.type === 'unique' };
                }
            });

            const equippedNames = [];
            for (const [slot, best] of Object.entries(slots)) {
                if (!best.item) continue;

                const currentEquippedId = user.equipment.get(slot);
                const targetId = best.isUnique ? best.item.data.instanceId : best.item.data.id;

                if (currentEquippedId === targetId) continue;

                // Unequip current
                if (currentEquippedId) {
                    const oldUnique = user.uniqueInventory.find(i => i.instanceId === currentEquippedId);
                    if (oldUnique) oldUnique.isEquipped = false;
                    else user.addItem(currentEquippedId, 1);
                }

                // Equip new
                if (best.isUnique) {
                    best.item.data.isEquipped = true;
                    user.equipment.set(slot, best.item.data.instanceId);
                    equippedNames.push(best.item.data.name);
                } else {
                    user.removeItem(best.item.data.id, 1);
                    user.equipment.set(slot, best.item.data.id);
                    equippedNames.push(best.item.data.name);
                }
            }

            if (equippedNames.length === 0) {
                return interaction.editReply('✨ You are already wearing your best gear!');
            }

            user.markModified('equipment');
            user.markModified('uniqueInventory');
            user.markModified('inventory');
            await user.save();
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Auto-Equip Complete')
                .setDescription(`Successfully equipped your best available gear:\n\n${equippedNames.map(n => `✅ **${n}**`).join('\n')}`)
                .setColor('#2ecc71');
            
            return interaction.editReply({ embeds: [embed] });
        }

        const itemInput = interaction.options.getString('item_id').toLowerCase();
        
        let uniqueItem = user.uniqueInventory.find(i => 
            i.instanceId === itemInput || i.instanceId.endsWith(itemInput)
        );

        let itemData = null;
        let isUnique = false;

        if (uniqueItem) {
            itemData = getItemData(uniqueItem.itemId);
            isUnique = true;
            if (uniqueItem.isEquipped) return interaction.editReply(`❌ **${uniqueItem.name}** is already equipped!`);
        } else {
            itemData = getItemData(itemInput);
            if (!itemData) return interaction.editReply(`❌ Item **${itemInput}** not found.`);
            
            const currentAmount = user.inventory.get(itemData.id) || 0;
            if (currentAmount < 1) return interaction.editReply(`❌ You do not have **${itemData.name}** in your inventory.`);
        }

        if (!itemData) return interaction.editReply(`❌ Item data not found.`);

        const allowedTypes = ['weapon', 'armor', 'chestplate', 'helmet', 'boots', 'leggings', 'sword', 'staff', 'bow', 'dagger'];
        if (!allowedTypes.includes(itemData.type.toLowerCase())) {
            return interaction.editReply(`❌ **${itemData.name}** is a **${itemData.type}** and cannot be equipped.`);
        }

        if (itemData.allowedClasses && !itemData.allowedClasses.includes(user.class)) {
            const classNames = itemData.allowedClasses.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ');
            return interaction.editReply(`❌ This item can only be equipped by: **${classNames}**.`);
        }
        
        let slot = 'weapon';
        const type = itemData.type.toLowerCase();
        if (type === 'chestplate' || type === 'armor') slot = 'chest';
        else if (type === 'helmet') slot = 'head';
        else if (type === 'boots') slot = 'feet';
        else if (type === 'leggings') slot = 'legs';
        else slot = 'weapon'; 
        
        const oldEquippedId = user.equipment.get(slot);
        
        if (oldEquippedId) {
            const oldUnique = user.uniqueInventory.find(i => i.instanceId === oldEquippedId);
            if (oldUnique) {
                oldUnique.isEquipped = false;
            } else {
                user.addItem(oldEquippedId, 1);
            }
        }

        if (isUnique) {
            uniqueItem.isEquipped = true;
            user.equipment.set(slot, uniqueItem.instanceId);
        } else {
            user.removeItem(itemData.id, 1);
            user.equipment.set(slot, itemData.id);               
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Equipment Updated')
            .setDescription(`✅ Equipped **${isUnique ? uniqueItem.name : itemData.name}** to **${slot}**.`)
            .setColor('#3498db');

        if (oldEquippedId) {
            const oldItemData = getItemData(oldEquippedId) || user.uniqueInventory.find(i => i.instanceId === oldEquippedId);
            embed.addFields({ name: 'Unequipped', value: `**${oldItemData ? oldItemData.name : oldEquippedId}**` });
        }
        
        return interaction.editReply({ embeds: [embed] });
    }
};