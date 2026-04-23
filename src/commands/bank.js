const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const { findItem } = require('../utils/itemUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Access your private vault to store gold and items.')
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('View your current bank balance and storage capacity.')
        )
        .addSubcommand(sub =>
            sub.setName('deposit')
                .setDescription('Move assets from your inventory to your bank.')
                .addStringOption(opt => opt.setName('type').setDescription('Gold or Item?').setRequired(true).addChoices({ name: 'Gold', value: 'gold' }, { name: 'Item', value: 'item' }))
                .addStringOption(opt => opt.setName('item').setDescription('Item to deposit (if type is Item)').setRequired(false).setAutocomplete(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('withdraw')
                .setDescription('Take assets out of your bank.')
                .addStringOption(opt => opt.setName('type').setDescription('Gold or Item?').setRequired(true).addChoices({ name: 'Gold', value: 'gold' }, { name: 'Item', value: 'item' }))
                .addStringOption(opt => opt.setName('item').setDescription('Item to withdraw (if type is Item)').setRequired(false).setAutocomplete(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('upgrade')
                .setDescription('Pay gold to increase your vault storage capacity.')
        ),

    async autocomplete(interaction) {
        const sub = interaction.options.getSubcommand();
        const type = interaction.options.getString('type');
        if (type !== 'item') return interaction.respond([]);

        const focusedValue = interaction.options.getFocused().toLowerCase();
        const user = await User.findOne({ userId: interaction.user.id }).select('inventory uniqueInventory bank').lean();
        if (!user) return interaction.respond([]);

        const choices = [];

        if (sub === 'deposit') {
            const invEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);
            for (const [id, qty] of invEntries) {
                const item = MASTER_ITEM_MAP[id];
                const name = item ? item.name : id;
                if (name.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `${name} (x${qty})`, value: id });
                }
            }
            user.uniqueInventory?.forEach(ui => {
                if (ui.name.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `⭐ ${ui.name} (${ui.rarity})`, value: ui.instanceId });
                }
            });
        } else if (sub === 'withdraw') {
            const bankEntries = user.bank.inventory instanceof Map ? user.bank.inventory.entries() : Object.entries(user.bank.inventory);
            for (const [id, qty] of bankEntries) {
                const item = MASTER_ITEM_MAP[id];
                const name = item ? item.name : id;
                if (name.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `${name} (x${qty})`, value: id });
                }
            }
            user.bank.uniqueInventory?.forEach(ui => {
                if (ui.name.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `⭐ ${ui.name} (${ui.rarity})`, value: ui.instanceId });
                }
            });
        }

        await interaction.respond(choices.slice(0, 25));
    },

    async handleButton(interaction, action, args) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        if (action === 'upgrade_slots') {
            const currentCap = user.bank.capacity;
            const slotVaultLevel = Math.max(0, (currentCap - 20) / 10);
            const slotUpgradeCost = 5000 * Math.pow(2, slotVaultLevel);

            if (user.gold < slotUpgradeCost) return interaction.update({ content: '❌ Not enough gold!', embeds: [], components: [] });
            
            user.gold -= slotUpgradeCost;
            user.bank.capacity += 10;
            await user.save();
            return interaction.update({ content: `✅ Vault slots expanded to **${user.bank.capacity}**!`, embeds: [], components: [] });
        } 
        else if (action === 'upgrade_gold') {
            const currentGoldCap = user.bank.goldCapacity || 10000;
            const goldVaultLevel = Math.log2(currentGoldCap / 10000);
            const goldUpgradeCost = 8000 * Math.pow(2, goldVaultLevel);

            if (user.gold < goldUpgradeCost) return interaction.update({ content: '❌ Not enough gold!', embeds: [], components: [] });
            
            user.gold -= goldUpgradeCost;
            user.bank.goldCapacity = (user.bank.goldCapacity || 10000) * 2;
            await user.save();
            return interaction.update({ content: `✅ Gold vault expanded to **${user.bank.goldCapacity.toLocaleString()}g**!`, embeds: [], components: [] });
        } 
        else if (action === 'upgrade_cancel') {
            return interaction.update({ content: 'Upgrade cancelled.', embeds: [], components: [] });
        }
    },

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        } catch (e) {
            console.error('Failed to defer bank reply:', e);
            return;
        }
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        const sub = interaction.options.getSubcommand();

        if (sub === 'info') {
            const interestEarned = user.calculateInterest();
            await user.save();

            const bankInv = user.bank.inventory;
            const bankUnique = user.bank.uniqueInventory;
            const currentItemCount = (bankInv instanceof Map ? bankInv.size : Object.keys(bankInv).length) + (bankUnique?.length || 0);

            const embed = new EmbedBuilder()
                .setTitle('🏦 Oakhaven Royal Vault')
                .setDescription('Your assets are safe with us. We even offer a modest interest on your gold savings!')
                .setColor('#f1c40f')
                .addFields(
                    { name: '💰 Gold Balance', value: `**${user.bank.gold.toLocaleString()}** / **${(user.bank.goldCapacity || 10000).toLocaleString()}g**`, inline: false },
                    { name: '📦 Item Storage', value: `**${currentItemCount}** / **${user.bank.capacity}** slots`, inline: true },
                    { name: '📈 Interest Rate', value: '`0.05% / day`', inline: true }
                )
                .setFooter({ text: 'Vault items are protected from loss upon death.' });

            if (interestEarned > 0) {
                embed.addFields({ name: '✨ Recent Earnings', value: `You earned **${interestEarned}g** in interest since your last visit!` });
            }

            if (currentItemCount > 0) {
                let itemsList = [];
                const entries = bankInv instanceof Map ? bankInv.entries() : Object.entries(bankInv);
                for (const [id, qty] of entries) {
                    const item = MASTER_ITEM_MAP[id];
                    itemsList.push(`• ${item ? item.name : id} x${qty}`);
                }
                bankUnique.forEach(ui => {
                    itemsList.push(`• ⭐ **${ui.name}** (${ui.rarity})`);
                });

                const display = itemsList.slice(0, 10).join('\n') + (itemsList.length > 10 ? `\n*...and ${itemsList.length - 10} more*` : '');
                embed.addFields({ name: '📜 Stored Items', value: display || 'None' });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'deposit') {
            const type = interaction.options.getString('type');
            const amount = interaction.options.getInteger('amount') || 1;

            if (type === 'gold') {
                const goldAmt = interaction.options.getInteger('amount');
                if (!goldAmt || goldAmt <= 0) return interaction.editReply('❌ Specify a valid amount of gold to deposit.');
                if (user.gold < goldAmt) return interaction.editReply(`❌ You only have **${user.gold}g** on hand.`);

                const goldCap = user.bank.goldCapacity || 10000;
                if (user.bank.gold + goldAmt > goldCap) {
                    const canFit = goldCap - user.bank.gold;
                    return interaction.editReply(`❌ Your gold vault only has room for **${canFit.toLocaleString()}g** more. Upgrade your gold vault to store more!`);
                }

                user.gold -= goldAmt;
                user.bank.gold += goldAmt;
                await user.save();
                return interaction.editReply(`✅ Deposited **${goldAmt.toLocaleString()}g** into your vault.`);
            } else {
                const itemInput = interaction.options.getString('item');
                if (!itemInput) return interaction.editReply('❌ Specify an item to deposit.');

                const bankInv = user.bank.inventory;
                const bankUnique = user.bank.uniqueInventory;
                const currentSlots = (bankInv instanceof Map ? bankInv.size : Object.keys(bankInv).length) + (bankUnique?.length || 0);
                
                const uniqueIdx = user.uniqueInventory.findIndex(i => i.instanceId === itemInput);
                if (uniqueIdx !== -1) {
                    if (currentSlots >= user.bank.capacity) return interaction.editReply('❌ Your vault is full! Upgrade it to store more items.');
                    
                    const item = user.uniqueInventory[uniqueIdx];
                    if (item.isEquipped) return interaction.editReply('❌ Unequip the item before depositing it!');

                    user.bank.uniqueInventory.push(item);
                    user.uniqueInventory.splice(uniqueIdx, 1);
                    await user.save();
                    return interaction.editReply(`✅ Deposited ⭐ **${item.name}** into your vault.`);
                }

                const itemData = findItem(itemInput);
                if (!itemData) return interaction.editReply('❌ Item not found in your inventory.');
                
                const hasItem = user.inventory.get(itemData.id) || 0;
                if (hasItem < amount) return interaction.editReply(`❌ You only have **${hasItem}x** ${itemData.name}.`);

                const alreadyInBank = user.bank.inventory.has(itemData.id);
                if (!alreadyInBank && currentSlots >= user.bank.capacity) {
                    return interaction.editReply('❌ Your vault is full! Upgrade it to store more items.');
                }

                user.removeItem(itemData.id, amount);
                user.addBankItem(itemData.id, amount);
                await user.save();
                return interaction.editReply(`✅ Deposited **${amount}x ${itemData.name}** into your vault.`);
            }
        }

        if (sub === 'withdraw') {
            const type = interaction.options.getString('type');
            const amount = interaction.options.getInteger('amount') || 1;

            if (type === 'gold') {
                const goldAmt = interaction.options.getInteger('amount');
                if (!goldAmt || goldAmt <= 0) return interaction.editReply('❌ Specify a valid amount of gold to withdraw.');
                if (user.bank.gold < goldAmt) return interaction.editReply(`❌ You only have **${user.bank.gold}g** in your vault.`);

                user.bank.gold -= goldAmt;
                user.gold += goldAmt;
                await user.save();
                return interaction.editReply(`✅ Withdrew **${goldAmt.toLocaleString()}g** from your vault.`);
            } else {
                const itemInput = interaction.options.getString('item');
                if (!itemInput) return interaction.editReply('❌ Specify an item to withdraw.');

                const bankUniqueIdx = user.bank.uniqueInventory.findIndex(i => i.instanceId === itemInput);
                if (bankUniqueIdx !== -1) {
                    const item = user.bank.uniqueInventory[bankUniqueIdx];
                    user.uniqueInventory.push(item);
                    user.bank.uniqueInventory.splice(bankUniqueIdx, 1);
                    await user.save();
                    return interaction.editReply(`✅ Withdrew ⭐ **${item.name}** from your vault.`);
                }

                const itemData = findItem(itemInput); // findItem uses MASTER_ITEM_MAP internally
                if (!itemData) return interaction.editReply('❌ Item not found in your vault.');

                const hasInBank = user.bank.inventory.get(itemData.id) || 0;
                if (hasInBank < amount) return interaction.editReply(`❌ Your vault only contains **${hasInBank}x** ${itemData.name}.`);

                user.removeBankItem(itemData.id, amount);
                user.addItem(itemData.id, amount);
                await user.save();
                return interaction.editReply(`✅ Withdrew **${amount}x ${itemData.name}** from your vault.`);
            }
        }

        if (sub === 'upgrade') {
            const currentCap = user.bank.capacity;
            const currentGoldCap = user.bank.goldCapacity || 10000;

            const slotVaultLevel = Math.max(0, (currentCap - 20) / 10);
            const slotUpgradeCost = 5000 * Math.pow(2, slotVaultLevel);
            
            const goldVaultLevel = Math.log2(currentGoldCap / 10000);
            const goldUpgradeCost = 8000 * Math.pow(2, goldVaultLevel);

            const embed = new EmbedBuilder()
                .setTitle('⚒️ Royal Vault Upgrades')
                .setDescription('Select an upgrade to expand your vault storage.')
                .setColor('#3498db')
                .addFields(
                    { name: '📦 Inventory Slots', value: `Current: **${currentCap}**\nNext: **${currentCap + 10}**\nCost: **${slotUpgradeCost.toLocaleString()}g**`, inline: true },
                    { name: '💰 Gold Vault', value: `Current: **${currentGoldCap.toLocaleString()}g**\nNext: **${(currentGoldCap * 2).toLocaleString()}g**\nCost: **${goldUpgradeCost.toLocaleString()}g**`, inline: true }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('bank:upgrade_slots')
                        .setLabel('Upgrade Slots')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('bank:upgrade_gold')
                        .setLabel('Upgrade Gold Vault')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('bank:upgrade_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    }
};