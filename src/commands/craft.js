const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');
const { MASTER_ITEM_LIST } = require('../data/shopItems');
const { checkStatus } = require('../utils/checks');
const { addActivityXp } = require('../systems/xp');
const { findItem } = require('../utils/itemUtils');
const LevelUpVisuals = require('../utils/LevelUpVisuals');

const ITEMS_PER_PAGE = 10;

function getAllCraftables() {
    // Filter out items that are only brewable or have no recipe
    return MASTER_ITEM_LIST.filter(item => item.craftable && !item.brewable);
}

function getCraftPage(page = 0) {
    const craftables = getAllCraftables();
    const maxPages = Math.ceil(craftables.length / ITEMS_PER_PAGE) - 1;
    page = Math.max(0, Math.min(page, maxPages));

    const startIndex = page * ITEMS_PER_PAGE;
    const itemsOnPage = craftables.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle('🛠️ Crafting Recipes')
        .setColor('#E67E22');

    if (itemsOnPage.length === 0) {
        embed.setDescription('No craftable items found.');
    } else {
        let description = `*Page ${page + 1} of ${maxPages + 1}*\n\n`;
        itemsOnPage.forEach(item => {
            const recipeStr = Object.entries(item.recipe || {})
                .map(([mat, qty]) => `${qty}x ${mat.replace(/_/g, ' ')}`)
                .join(', ');
            
            description += `**${item.name}** (\`${item.id}\`)\nNeeds: ${recipeStr}\n\n`;
        });
        embed.setDescription(description);
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`craft:page:${page - 1}`)
                .setLabel('⬅️ Prev')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`craft:page:${page + 1}`)
                .setLabel('Next ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= maxPages),
        );

    return { embed, row };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('Craft equipment and tools.')
        .addSubcommand(sub => 
            sub.setName('list')
                .setDescription('View all craftable items.')
        )
        .addSubcommand(sub =>
            sub.setName('make')
                .setDescription('Craft an item.')
                .addStringOption(option => 
                    option.setName('item_id')
                        .setDescription('The Name or ID of the item')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const craftables = getAllCraftables();
        const choices = craftables.filter(item => 
            item.name.toLowerCase().includes(focusedValue) || 
            item.id.toLowerCase().includes(focusedValue)
        ).slice(0, 25);

        await interaction.respond(
            choices.map(choice => ({ name: choice.name, value: choice.id })),
        );
    },

    async handleButton(interaction, action, args) {
        if (action !== 'page') return;
        await interaction.deferUpdate();
        const targetPage = parseInt(args[0]);
        const { embed, row } = getCraftPage(targetPage);
        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const user = await User.findOne({ userId: interaction.user.id });

        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        // --- LOCATION CHECK ---
        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const currentPlace = subRegion.places ? subRegion.places.find(p => p.id === user.currentPlace) : null;

        if (!currentPlace || !currentPlace.features.includes('blacksmith')) {
            return interaction.reply({ content: "❌ You need a **Blacksmith** to craft! You must enter a **Town** first.", flags: [MessageFlags.Ephemeral] });
        }

        if (sub === 'list') {
            const { embed, row } = getCraftPage(0);
            return interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
        }

        if (sub === 'make') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const itemInput = interaction.options.getString('item_id');

            if (!(await checkStatus(interaction, user))) return;

            const item = findItem(itemInput);

            if (!item || !item.craftable || item.brewable) {
                return interaction.editReply({ content: `❌ **${itemInput}** is not a craftable equipment item. Try \`/brew\` for potions.` });
            }

            const recipe = item.recipe;
            if (!recipe) {
                return interaction.editReply({ content: `❌ **${item.name}** has no recipe defined.` });
            }

            let missing = [];
            for (const [material, amount] of Object.entries(recipe)) {
                const userAmount = user.inventory.get(material) || 0;
                if (userAmount < amount) {
                    missing.push(`${amount - userAmount}x ${material.replace(/_/g, ' ')}`);
                }
            }

            if (missing.length > 0) {
                return interaction.editReply({ 
                    content: `❌ **Missing Materials:**\n- ${missing.join('\n- ')}`
                });
            }

            for (const [material, amount] of Object.entries(recipe)) {
                user.removeItem(material, amount);
            }

            user.addItem(item.id, 1);
            
            if (item.type === 'pickaxe' || item.type === 'axe' || item.type === 'rod') {
                 if (!user.toolDurability.has(item.id)) {
                    user.toolDurability.set(item.id, item.maxDurability || 50);
                 }
            }

            const { xpAmount, summary } = await addActivityXp(user, 'craft');
            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('🔨 Crafting Successful')
                .setDescription(`You crafted a **${item.name}**!`)
                .setColor('#00FF00')
                .addFields({ name: 'Experience', value: `+${xpAmount} XP`, inline: true });
            
            if (item.maxDurability) embed.addFields({ name: 'Durability', value: `${item.maxDurability}`, inline: true });
            if (item.baseDefense) embed.addFields({ name: 'Defense', value: `${item.baseDefense}`, inline: true });
            if (item.baseAttack) embed.addFields({ name: 'Attack', value: `${item.baseAttack}`, inline: true });

            const embeds = [embed];
            if (summary.playerLevelsGained > 0 || summary.classLevelsGained > 0) {
                embeds.push(LevelUpVisuals.createLevelUpEmbed(user, summary));
            }

            return interaction.editReply({ embeds });
        }
    }
};