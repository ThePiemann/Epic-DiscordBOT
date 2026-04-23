const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const { checkStatus } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salvage')
        .setDescription('Salvage items or relics for materials and essence.')
        .addSubcommand(sub => sub
            .setName('item')
            .setDescription('Salvage standard equipment or tools.')
            .addStringOption(opt => opt.setName('id').setDescription('Item Name or ID').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(sub => sub
            .setName('rarity')
            .setDescription('Salvage all relics of a specific rarity (Safe: skips locked/equipped).')
            .addStringOption(opt => opt.setName('rarity').setDescription('Rarity to salvage').setRequired(true).addChoices(
                { name: 'Common', value: 'Common' },
                { name: 'Uncommon', value: 'Uncommon' },
                { name: 'Rare', value: 'Rare' },
                { name: 'Epic', value: 'Epic' }
            ))
        )
        .addSubcommand(sub => sub
            .setName('relic')
            .setDescription('Salvage a specific relic for Essence.')
            .addStringOption(opt => opt.setName('id').setDescription('Relic Name or ID (last 6 digits)').setRequired(true).setAutocomplete(true))
        ),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const sub = interaction.options.getSubcommand();
        const focusedValue = focusedOption.value.toLowerCase();

        const user = await User.findOne({ userId: interaction.user.id }).select('inventory relicInventory').lean();
        if (!user) return interaction.respond([]);

        if (sub === 'item') {
            const choices = [];
            const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);
            const allowedTypes = ['weapon', 'armor', 'axe', 'pickaxe', 'rod', 'sword', 'bow', 'staff', 'chestplate', 'helmet', 'leggings', 'boots'];

            for (const [itemId, qty] of inventoryEntries) {
                const item = MASTER_ITEM_MAP[itemId];
                if (item && allowedTypes.includes((item.type || '').toLowerCase())) {
                    if (item.name.toLowerCase().includes(focusedValue) || itemId.toLowerCase().includes(focusedValue)) {
                        choices.push({ name: `${item.name} (x${qty})`, value: itemId });
                    }
                }
            }
            return interaction.respond(choices.slice(0, 25));
        }

        if (sub === 'relic') {
            const choices = [];
            if (user.relicInventory) {
                user.relicInventory.forEach(relic => {
                    if (relic.isEquipped) return;
                    const shortId = relic.instanceId.slice(-6);
                    if (relic.name.toLowerCase().includes(focusedValue) || shortId.toLowerCase().includes(focusedValue)) {
                        choices.push({ name: `${relic.name} (+${relic.level}) [${shortId}]`, value: shortId });
                    }
                });
            }
            return interaction.respond(choices.slice(0, 25));
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        if (!(await checkStatus(interaction, user))) return;

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'item') {
            const itemId = interaction.options.getString('id').toLowerCase();
            const itemData = MASTER_ITEM_MAP[itemId];

            if (!itemData) return interaction.editReply('❌ Item not found.');
            const userQty = user.inventory.get(itemId) || 0;
            if (userQty <= 0) return interaction.editReply(`❌ You don't have a **${itemData.name}**.`);

            const type = (itemData.type || '').toLowerCase();
            const allowedTypes = ['weapon', 'armor', 'axe', 'pickaxe', 'rod', 'sword', 'bow', 'staff', 'chestplate', 'helmet', 'leggings', 'boots'];
            if (!allowedTypes.includes(type)) return interaction.editReply(`❌ You cannot salvage this item type.`);

            let material = 'wood';
            const name = itemData.name.toLowerCase();
            if (name.includes('iron') || name.includes('sword')) material = 'iron_ore';
            if (name.includes('stone')) material = 'stone';
            const amount = Math.floor(Math.random() * 3) + 1;

            user.removeItem(itemId, 1);
            user.addItem(material, amount);
            await user.save();

            return interaction.editReply(`♻️ Salvaged **${itemData.name}** for **${amount}x ${material.replace(/_/g, ' ')}**.`);
        }

        if (subcommand === 'rarity') {
            const targetRarity = interaction.options.getString('rarity');
            let relicEssenceCount = 0;
            let totalSalvaged = 0;
            const salvagedNames = [];

            // Filter out relics to remove
            const originalCount = user.relicInventory.length;
            user.relicInventory = user.relicInventory.filter(relic => {
                // If it doesn't match rarity OR is equipped OR is locked, KEEP IT
                if (relic.stars !== this.rarityToStars(targetRarity) || relic.isEquipped || relic.isLocked) {
                    return true;
                }

                // Otherwise, salvage it
                totalSalvaged++;
                if (salvagedNames.length < 5) salvagedNames.push(relic.name);
                
                // Roll for rewards
                if (relic.stars === 3) { if (Math.random() < 0.50) relicEssenceCount++; }
                else if (relic.stars === 4) { if (Math.random() < 0.80) relicEssenceCount++; }
                
                return false;
            });

            if (totalSalvaged === 0) {
                return interaction.editReply(`🎒 No unlocked/unequipped **${targetRarity}** relics found to salvage.`);
            }

            if (relicEssenceCount > 0) user.addItem('relic_essence', relicEssenceCount);
            user.markModified('relicInventory');
            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('♻️ Bulk Salvage Complete')
                .setDescription(`Successfully dismantled **${totalSalvaged}** relics of **${targetRarity}** rarity.`)
                .addFields(
                    { name: 'Essence Gained', value: `✨ **+${relicEssenceCount}x Relic Essence**`, inline: true },
                    { name: 'Relics Remaining', value: `📦 ${user.relicInventory.length}`, inline: true }
                )
                .setColor('#e67e22');

            if (salvagedNames.length > 0) {
                embed.addFields({ name: 'Partial List', value: salvagedNames.join(', ') + (totalSalvaged > 5 ? '...' : '') });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'relic') {
            const relicId = interaction.options.getString('id').toLowerCase();
            const relicIndex = user.relicInventory.findIndex(r => r.instanceId.endsWith(relicId));

            if (relicIndex === -1) return interaction.editReply("❌ Relic not found.");
            const relic = user.relicInventory[relicIndex];

            if (relic.isEquipped) return interaction.editReply("❌ Cannot salvage an equipped relic!");
            if (relic.isLocked) return interaction.editReply("❌ That relic is **locked**! Unlock it first if you really want to salvage it.");

            let rewardId = null;
            let rewardAmount = 0;
            let resultMsg = "";

            if (relic.stars === 3) {
                if (Math.random() < 0.50) { rewardId = 'relic_essence'; rewardAmount = 1; }
                else resultMsg = "Got some useless dust...";
            } else if (relic.stars === 4) {
                if (Math.random() < 0.80) { rewardId = 'relic_essence'; rewardAmount = 1; }
                else resultMsg = "Got some useless dust...";
            } else if (relic.stars === 5) {
                rewardId = 'sanctifying_essence'; 
                rewardAmount = 1;
            } else {
                resultMsg = "Low tier relics give no essence.";
            }

            user.relicInventory.splice(relicIndex, 1);
            if (rewardId) {
                user.addItem(rewardId, rewardAmount);
                resultMsg = `Received **${rewardAmount}x ${rewardId.replace(/_/g, ' ').toUpperCase()}**!`;
            }

            user.markModified('relicInventory');
            await user.save();
            const embed = new EmbedBuilder()
                .setTitle('♻️ Relic Salvaged')
                .setDescription(`You dismantled **${relic.name}** (${relic.stars}⭐).`)
                .addFields({ name: 'Result', value: resultMsg })
                .setColor('#e67e22');

            return interaction.editReply({ embeds: [embed] });
        }
    },

    rarityToStars(r) {
        const map = { 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5, 'Mythic': 6 };
        return map[r] || 1;
    }
};