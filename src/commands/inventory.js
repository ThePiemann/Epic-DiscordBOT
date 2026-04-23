// src/commands/inventory.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const { RARITIES } = require('../utils/rarityUtils');
const { advanceTutorial } = require('../utils/checks');

const ITEMS_PER_PAGE = 10;

const EMOJIS = {
    weapon: '⚔️',
    armor: '🛡️',
    tool: '🛠️',
    consumable: '🧪',
    material: '🪵',
    misc: '📦'
};

const CATEGORY_MAP = {
    'weapon': 'weapon', 'sword': 'weapon', 'staff': 'weapon', 'bow': 'weapon',
    'head': 'armor', 'chest': 'armor', 'chestplate': 'armor', 'legs': 'armor', 'feet': 'armor', 'accessory': 'armor',
    'pickaxe': 'tool', 'axe': 'tool', 'rod': 'tool',
    'consumable': 'consumable'
};

function getItemCategory(type) {
    if (!type) return 'material';
    return CATEGORY_MAP[type.toLowerCase()] || 'material';
}

function getInventoryPage(user, page = 0) {
    let items = [];
    
    for (const [itemId, amount] of user.inventory.entries()) {
        const itemData = MASTER_ITEM_MAP[itemId];
        const type = itemData ? itemData.type : 'material';
        const category = getItemCategory(type);
        
        items.push({
            id: itemId,
            name: itemData ? itemData.name : itemId.replace(/_/g, ' '),
            amount: amount,
            rarity: 'Common',
            category: category,
            type: type,
            isUnique: false
        });
    }

    for (const uniqueItem of user.uniqueInventory) {
        const itemData = MASTER_ITEM_MAP[uniqueItem.itemId];
        const type = itemData ? itemData.type : 'misc';
        const category = getItemCategory(type);

        items.push({
            id: uniqueItem.instanceId,
            itemId: uniqueItem.itemId,
            name: uniqueItem.name,
            rarity: uniqueItem.rarity,
            category: category,
            type: type,
            stats: uniqueItem.stats,
            isUnique: true,
            amount: 1
        });
    }

    items.sort((a, b) => {
        const catOrder = { 'weapon': 1, 'armor': 2, 'tool': 3, 'consumable': 4, 'material': 5 };
        const catA = catOrder[a.category] || 99;
        const catB = catOrder[b.category] || 99;
        if (catA !== catB) return catA - catB;

        const rarityOrder = { 'Legendary': 1, 'Epic': 2, 'Rare': 3, 'Uncommon': 4, 'Common': 5 };
        const rarityA = rarityOrder[a.rarity] || 99;
        const rarityB = rarityOrder[b.rarity] || 99;
        if (rarityA !== rarityB) return rarityA - rarityB;

        return a.name.localeCompare(b.name);
    });

    const maxPages = Math.ceil(items.length / ITEMS_PER_PAGE) - 1;
    page = Math.max(0, Math.min(page, maxPages));

    const startIndex = page * ITEMS_PER_PAGE;
    const itemsOnPage = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle(`🎒 ${user.username}'s Inventory`)
        .setColor('#FFA500');

    if (itemsOnPage.length === 0) {
        embed.setDescription('*Your bag is empty... Go gather some resources!*');
    } else {
        let description = `**Page ${page + 1} / ${maxPages + 1}**\n\n`;
        
        let lastCategory = null;
        itemsOnPage.forEach(item => {
            if (item.category !== lastCategory) {
                const categoryNames = { weapon: 'Weapons', armor: 'Armor', tool: 'Tools', consumable: 'Potions', material: 'Materials' };
                const catName = categoryNames[item.category] || 'Misc';
                description += `\n**--- ${EMOJIS[item.category] || '📦'} ${catName.toUpperCase()} ---**\n`;
                lastCategory = item.category;
            }

            if (item.isUnique) {
                const statEntries = Object.entries(item.stats || {})
                    .filter(([_, val]) => val > 0)
                    .map(([stat, val]) => `${stat.toUpperCase()}:+${val}`);
                const statStr = statEntries.length > 0 ? ` [${statEntries.join(', ')}]` : '';
                const starsStr = '⭐'.repeat(item.stars || 1);
                
                description += `**${item.name}** ${starsStr} (${item.rarity})${statStr}\n`;
                
                if (item.affixes && item.affixes.length > 0) {
                    const affixStr = item.affixes.map(a => `✨ *${a.name}* (${a.type === 'percent' ? '+' + a.value + '%' : '+' + a.value} ${a.stat.toUpperCase()})`).join(', ');
                    description += `${affixStr}\n`;
                }
                
                description += `\`ID: ${item.id.slice(-6)}\`\n`;
            } else {
                description += `**${item.name}** \`x${item.amount}\`\n`;
            }
        });
        
        embed.setDescription(description);
        embed.setFooter({ text: `Total Unique/Stacks: ${items.length}` });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`inventory:page:${page - 1}`)
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`inventory:page:${page + 1}`)
                .setLabel('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= maxPages),
        );

    return { embed, row };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Check your bag'),

    async handleButton(interaction, action, args) {
        if (action !== 'page') return;
        await interaction.deferUpdate();
        
        const targetPage = parseInt(args[0]);
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.followUp({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });

        const { embed, row } = getInventoryPage(user, targetPage);
        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply({ content: 'Use `/start` first!' });

        // 📖 Tutorial Progress: Step 7 (Index 6)
        const tutorialEmbeds = await advanceTutorial(user, 6, interaction, '1 Wooden Axe', (u) => { u.addItem('wooden_axe', 1); });

        if (user.inventory.size === 0 && user.uniqueInventory.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${user.username}'s Inventory`)
                .setColor('#FFA500')
                .setDescription('*Your bag is empty...*');
            const embeds = [embed];
            if (tutorialEmbeds) embeds.push(...tutorialEmbeds);
            return interaction.editReply({ embeds });
        }

        const { embed, row } = getInventoryPage(user, 0);
        const embeds = [embed];
        if (tutorialEmbeds) embeds.push(...tutorialEmbeds);
        await interaction.editReply({ embeds, components: [row] });
    },
};