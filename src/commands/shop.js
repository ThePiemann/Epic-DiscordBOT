const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { SHOP_ITEMS } = require('../data/shopItems');
const REGIONS = require('../data/regions');
const { findItem } = require('../utils/itemUtils');
const { advanceTutorial } = require('../utils/checks');

const ITEMS_PER_PAGE = 10;
const purchaseCooldowns = new Set();

// Helper to get emoji for item type
function getTypeEmoji(type) {
    const map = {
        'weapon': '⚔️', 'sword': '⚔️', 'staff': '🔮', 'bow': '🏹',
        'armor': '🛡️', 'chest': '👕', 'head': '🧢', 'legs': '👖', 'feet': '👢',
        'potion': '🧪', 'consumable': '🧪',
        'material': '🪵', 'tool': '🛠️', 'pickaxe': '⛏️', 'axe': '🪓', 'rod': '🎣'
    };
    return map[type] || '📦';
}

function getShopPage(user, page = 0) {
    const saleItems = SHOP_ITEMS.filter(item => item.price > 0);
    const maxPages = Math.ceil(saleItems.length / ITEMS_PER_PAGE) - 1;
    page = Math.max(0, Math.min(page, maxPages));

    const startIndex = page * ITEMS_PER_PAGE;
    const itemsOnPage = saleItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const shopEmbed = new EmbedBuilder()
        .setTitle('🛒 Town Shop')
        .setDescription(`Use \`/shop buy <item_id> <amount>\` to purchase.\n\n💰 **Balance:** ${user.gold} Gold`)
        .setColor('#f1c40f')
        .setFooter({ text: `Page ${page + 1} of ${maxPages + 1}` });

    if (itemsOnPage.length === 0) {
        shopEmbed.addFields({ name: 'Empty', value: 'No items for sale.' });
    } else {
        itemsOnPage.forEach(item => {
            const emoji = getTypeEmoji(item.type);
            let stockStr = "";
            if (item.dailyStock) {
                const purchased = user.dailyPurchases.get(item.id) || 0;
                stockStr = ` | 📦 **Stock: ${item.dailyStock - purchased}/${item.dailyStock}**`;
            }

            shopEmbed.addFields({
                name: `${emoji} ${item.name}`,
                value: `🆔 \`${item.id}\` | 💰 **${item.price} G**${stockStr}\n*${item.description || 'No description.'}*`,
                inline: false 
            });
        });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`shop:page:${page - 1}`)
                .setLabel('⬅️ Prev')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`shop:page:${page + 1}`)
                .setLabel('Next ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= maxPages),
        );
        
    return { embed: shopEmbed, row: row };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Manage the town shop (view/buy).')
        .addSubcommand(subcommand => 
            subcommand.setName('view').setDescription('View all items available in the shop.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('buy').setDescription('Purchase an item.')
                .addStringOption(option => option.setName('item_id').setDescription('Item Name or ID').setRequired(true).setAutocomplete(true))
                .addIntegerOption(option => option.setName('amount').setDescription('Quantity').setRequired(false))
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = SHOP_ITEMS.filter(item => 
            item.price > 0 && (
                item.name.toLowerCase().includes(focusedValue) || 
                item.id.toLowerCase().includes(focusedValue)
            )
        ).slice(0, 25);

        await interaction.respond(
            choices.map(choice => ({ name: `${choice.name} (${choice.price}G)`, value: choice.id })),
        );
    },

    async handleButton(interaction, action, args) {
        if (action !== 'page') return;
        try {
            await interaction.deferUpdate();
            const targetPage = parseInt(args[0]);
            const user = await User.findOne({ userId: interaction.user.id });
            if (!user) return;
            const { embed, row } = getShopPage(user, targetPage);
            return await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Shop Button Error:', error);
        }
    },

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
             await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }
        
        const subcommand = interaction.options.getSubcommand();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        // --- RESET DAILY STOCK ---
        const now = new Date();
        const lastClaim = user.lastDailyClaimDate || new Date(0);
        const isNewDay = now.toDateString() !== lastClaim.toDateString();
        if (isNewDay) {
            user.dailyPurchases.clear();
        }

        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const currentPlace = subRegion.places ? subRegion.places.find(p => p.id === user.currentPlace) : null;

        if (!currentPlace || !currentPlace.features.includes('shop')) {
            return interaction.editReply("❌ There is no shop here! You must enter a **Town** first.");
        }

        if (subcommand === 'view') {
            const tutorialEmbeds = await advanceTutorial(user, 4, interaction, '25 Gold', (u) => { u.gold += 25; });
            const { embed, row } = getShopPage(user, 0);
            const embeds = [embed];
            if (tutorialEmbeds) embeds.push(...tutorialEmbeds);
            return interaction.editReply({ embeds, components: [row] });
        }

        if (subcommand === 'buy') {
            if (purchaseCooldowns.has(interaction.user.id)) return interaction.editReply('⏳ Transaction in progress.');
            purchaseCooldowns.add(interaction.user.id);

            try {
                const itemInput = interaction.options.getString('item_id');
                const amount = interaction.options.getInteger('amount') || 1;
                if (amount < 1) return interaction.editReply('You must buy at least 1 item.');

                const itemToBuy = findItem(itemInput);
                if (!itemToBuy) return interaction.editReply(`Item \`${itemInput}\` not found.`);
                
                const inShop = SHOP_ITEMS.some(i => i.id === itemToBuy.id);
                if (!inShop || itemToBuy.price <= 0) return interaction.editReply(`**${itemToBuy.name}** cannot be bought here.`);

                // --- STOCK CHECK ---
                if (itemToBuy.dailyStock) {
                    const purchased = user.dailyPurchases.get(itemToBuy.id) || 0;
                    if (purchased + amount > itemToBuy.dailyStock) {
                        return interaction.editReply(`❌ **Out of Stock!** You can only buy **${itemToBuy.dailyStock - purchased}** more today.`);
                    }
                    user.dailyPurchases.set(itemToBuy.id, purchased + amount);
                }

                const totalCost = itemToBuy.price * amount;
                if (user.gold < totalCost) return interaction.editReply(`You need **${totalCost}** Gold, but you only have **${user.gold}** Gold.`);

                user.gold -= totalCost;
                user.addItem(itemToBuy.id, amount);
                
                let tutorialEmbeds = null;
                if (itemToBuy.id === 'small_potion') {
                    tutorialEmbeds = await advanceTutorial(user, 5, interaction, '1 Wooden Pickaxe', (u) => { u.addItem('wooden_pickaxe', 1); });
                }

                await user.save();
                const responseEmbed = new EmbedBuilder()
                    .setTitle('✅ Purchase Successful')
                    .setDescription(`You bought **${amount}x ${itemToBuy.name}** for **${totalCost}** Gold!`)
                    .setColor('#00FF00');

                const embeds = [responseEmbed];
                if (tutorialEmbeds) embeds.push(...tutorialEmbeds);
                return interaction.editReply({ embeds });
            } finally {
                purchaseCooldowns.delete(interaction.user.id);
            }
        }
    }
};