const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const REGIONS = require('../data/regions');
const { findItem } = require('../utils/itemUtils');
const { advanceTutorial } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell items from your inventory to the town shop.')
        .addSubcommand(sub =>
            sub.setName('item')
                .setDescription('Sell a specific item by name or ID.')
                .addStringOption(option => 
                    option.setName('item')
                        .setDescription('The name or ID of the item to sell.')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The quantity to sell (default 1).')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('category')
                .setDescription('Sell all items of a specific type (Safe: skips valuable items).')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The category of items to sell.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Materials', value: 'material' },
                            { name: 'Potions/Consumables', value: 'consumable' },
                            { name: 'Junk', value: 'junk' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('menu')
                .setDescription('Open the interactive selling menu.')
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const user = await User.findOne({ userId: interaction.user.id }).select('inventory').lean();
        if (!user || !user.inventory) return interaction.respond([]);

        const choices = [];
        const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);

        for (const [itemId, qty] of inventoryEntries) {
            const item = MASTER_ITEM_MAP[itemId];
            if (item && item.sellable) {
                const sellPrice = Math.floor(item.price * 0.5) || 1;
                if (item.name.toLowerCase().includes(focusedValue) || itemId.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `${item.name} (x${qty}) - ${sellPrice}G`, value: itemId });
                }
            }
        }

        await interaction.respond(choices.slice(0, 25));
    },

    async handleSelectMenu(interaction, action, args) {
        if (action !== 'select') return;
        await interaction.deferUpdate();
        const itemId = interaction.values[0];
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.followUp({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });

        return this.processSell(interaction, user, itemId, 1);
    },

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        // --- LOCATION CHECK ---
        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const currentPlace = subRegion.places ? subRegion.places.find(p => p.id === user.currentPlace) : null;

        if (!currentPlace || !currentPlace.features.includes('shop')) {
            return interaction.editReply("❌ There is no shop here! You must enter a **Town** first.");
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'menu') {
            const sellableItems = [];
            const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);
            for (const [invId, qty] of inventoryEntries) {
                const itemData = MASTER_ITEM_MAP[invId];
                if (itemData && itemData.sellable) {
                     sellableItems.push({ 
                         id: invId, 
                         name: itemData.name, 
                         qty, 
                         price: Math.floor(itemData.price * 0.5) || 1 
                     });
                }
            }

            if (sellableItems.length === 0) {
                return interaction.editReply("🎒 You don't have any items that the shop wants to buy.");
            }

            const options = sellableItems.slice(0, 25).map(item => ({
                label: `${item.name} (x${item.qty})`,
                description: `Sell for ${item.price} Gold each`,
                value: item.id
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('sell:select')
                    .setPlaceholder('Select an item to sell...')
                    .addOptions(options)
            );

            return interaction.editReply({
                content: '💰 **Sell Items:** Which item would you like to sell to the shop? (The shop buys at 50% value)',
                components: [row]
            });
        }

        if (subcommand === 'category') {
            const catType = interaction.options.getString('type');
            let totalGold = 0;
            let soldCount = 0;
            const itemsSold = [];

            const inventoryEntries = user.inventory instanceof Map ? Array.from(user.inventory.entries()) : Object.entries(user.inventory);
            
            for (const [itemId, qty] of inventoryEntries) {
                const itemData = MASTER_ITEM_MAP[itemId];
                if (!itemData || !itemData.sellable || qty <= 0) continue;

                // Category match (handle pot/consumable mapping)
                let itemCat = (itemData.type || '').toLowerCase();
                if (itemCat === 'potion') itemCat = 'consumable';
                if (itemData.family === 'junk') itemCat = 'junk';

                if (itemCat === catType) {
                    // Safety check: Skip valuable items (500g+) unless they are junk
                    if (itemData.price >= 1000 && itemCat !== 'junk') continue;

                    const unitPrice = Math.floor(itemData.price * 0.5) || 1;
                    totalGold += (unitPrice * qty);
                    soldCount += qty;
                    itemsSold.push(`${itemData.name} (x${qty})`);
                    user.inventory.delete(itemId);
                }
            }

            if (soldCount === 0) {
                return interaction.editReply(`🎒 No bulk items found in the **${catType}** category to sell.`);
            }

            user.gold += totalGold;
            user.markModified('inventory');
            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('💰 Bulk Sale Complete')
                .setDescription(`Successfully sold **${soldCount}** items from your **${catType}** collection.`)
                .addFields(
                    { name: 'Gold Earned', value: `**+${totalGold.toLocaleString()}g**`, inline: true },
                    { name: 'Total Balance', value: `💰 ${user.gold.toLocaleString()}g`, inline: true }
                )
                .setColor('#f1c40f');

            if (itemsSold.length > 0) {
                const list = itemsSold.slice(0, 10).join(', ') + (itemsSold.length > 10 ? `... and ${itemsSold.length - 10} more.` : '');
                embed.addFields({ name: 'Items Processed', value: list });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'item') {
            const itemIdArg = interaction.options.getString('item');
            const amountArg = interaction.options.getInteger('amount') || 1;
            const itemToSell = findItem(itemIdArg);
            if (!itemToSell) return interaction.editReply(`❌ Item \`${itemIdArg}\` not found.`);

            return this.processSell(interaction, user, itemToSell.id, amountArg);
        }
    },

    async processSell(interaction, user, itemId, amount) {
        if (amount < 1) return interaction.editReply('❌ You must sell at least 1 item.');

        const itemData = MASTER_ITEM_MAP[itemId];
        if (!itemData || !itemData.sellable) {
            return interaction.editReply(`❌ The shop isn't interested in buying **${itemData ? itemData.name : itemId}**.`);
        }

        const userQty = user.inventory.get(itemId) || 0;
        if (userQty < amount) {
            return interaction.editReply(`❌ You only have **${userQty}x ${itemData.name}**.`);
        }

        const unitPrice = Math.floor(itemData.price * 0.5) || 1;
        const totalGold = unitPrice * amount;

        // Execute
        user.removeItem(itemId, amount);
        user.gold += totalGold;
        
        // 📖 Tutorial Progress
        const tutorialEmbed = await advanceTutorial(user, 9, interaction, '100 Gold', (u) => {
            u.gold += 100;
        });

        await user.save();

        const embed = new EmbedBuilder()
            .setTitle('💰 Item Sold')
            .setDescription(`You sold **${amount}x ${itemData.name}** for **${totalGold} Gold**.`)
            .setColor('#f1c40f')
            .addFields({ name: 'New Balance', value: `💰 ${user.gold} Gold` });

        const embeds = [embed];
        if (tutorialEmbed) embeds.push(...tutorialEmbed);

        return interaction.editReply({ content: null, embeds, components: [] });
    }
};