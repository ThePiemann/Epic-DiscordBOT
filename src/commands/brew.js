const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const CONSUMABLES = require('../data/consumables');
const { checkStatus } = require('../utils/checks');
const { addActivityXp } = require('../systems/xp');
const { findItem } = require('../utils/itemUtils');
const LevelUpVisuals = require('../utils/LevelUpVisuals');

const ITEMS_PER_PAGE = 10;

function getAllBrewables() {
    return Object.values(CONSUMABLES).filter(c => c.brewable);
}

function getBrewPage(page = 0) {
    const brewables = getAllBrewables();
    const maxPages = Math.ceil(brewables.length / ITEMS_PER_PAGE) - 1;
    page = Math.max(0, Math.min(page, maxPages));

    const startIndex = page * ITEMS_PER_PAGE;
    const itemsOnPage = brewables.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle('⚗️ Brewing Recipes')
        .setColor('#9b59b6');

    if (itemsOnPage.length === 0) {
        embed.setDescription('No brewable potions found.');
    } else {
        let description = `*Page ${page + 1} of ${maxPages + 1}*\n\n`;
        itemsOnPage.forEach(item => {
            const recipeStr = Object.entries(item.recipe || {})
                .map(([mat, qty]) => `${qty}x ${mat.replace(/_/g, ' ')}`)
                .join(', ');
            
            description += `**${item.name}** (\`${item.id}\`)\nEffect: ${item.description}\nNeeds: ${recipeStr}\n\n`;
        });
        embed.setDescription(description);
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`brew:page:${page - 1}`)
                .setLabel('⬅️ Prev')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`brew:page:${page + 1}`)
                .setLabel('Next ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= maxPages),
        );

    return { embed, row };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('brew')
        .setDescription('Brew potions using gathered materials')
        .addSubcommand(sub => 
            sub.setName('list')
                .setDescription('View all brewable potions.')
        )
        .addSubcommand(sub =>
            sub.setName('make')
                .setDescription('Brew a potion.')
                .addStringOption(option => 
                    option.setName('potion_id')
                        .setDescription('The Name or ID of the potion')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const brewables = getAllBrewables();
        const choices = brewables.filter(item => 
            item.name.toLowerCase().includes(focusedValue) || 
            item.id.toLowerCase().includes(focusedValue)
        ).slice(0, 25);

        await interaction.respond(choiceToOption(choices));
    },

    async handleButton(interaction, action, args) {
        if (action !== 'page') return;
        await interaction.deferUpdate();
        const targetPage = parseInt(args[0]);
        const { embed, row } = getBrewPage(targetPage);
        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const user = await User.findOne({ userId: interaction.user.id });

        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        if (sub === 'list') {
            const { embed, row } = getBrewPage(0);
            return interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
        }

        if (sub === 'make') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const itemInput = interaction.options.getString('potion_id');

            if (!(await checkStatus(interaction, user))) return;

            const potion = findItem(itemInput);

            if (!potion || !potion.brewable) {
                return interaction.editReply({ content: `❌ **${itemInput}** is not a brewable potion.` });
            }

            const recipe = potion.recipe;
            if (!recipe) return interaction.editReply({ content: 'That potion cannot be brewed.' });

            let missing = [];
            for (const [material, amount] of Object.entries(recipe)) {
                const userAmount = user.inventory.get(material) || 0;
                if (userAmount < amount) {
                    missing.push(`${amount - userAmount}x ${material.replace(/_/g, ' ')}`);
                }
            }

            if (missing.length > 0) {
                const recipeList = Object.entries(recipe)
                    .map(([mat, amt]) => `- ${amt}x ${mat.replace(/_/g, ' ')}`)
                    .join('\n');

                return interaction.editReply({ 
                    content: `❌ **Not enough materials!**\n\n**Recipe for ${potion.name}:**\n${recipeList}\n\n**Missing:**\n- ${missing.join('\n- ')}`
                });
            }

            for (const [material, amount] of Object.entries(recipe)) {
                user.removeItem(material, amount);
            }

            user.addItem(potion.id, 1);
            const { xpAmount, summary } = await addActivityXp(user, 'brew');
            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('⚗️ Brewing Successful')
                .setDescription(`You brewed a **${potion.name}**!`)
                .addFields(
                    { name: 'Effect', value: potion.description, inline: true },
                    { name: 'Experience', value: `+${xpAmount} XP`, inline: true }
                )
                .setColor('#9b59b6');

            const embeds = [embed];
            if (summary.playerLevelsGained > 0 || summary.classLevelsGained > 0) {
                embeds.push(LevelUpVisuals.createLevelUpEmbed(user, summary));
            }

            return interaction.editReply({ embeds });
        }
    }
};

function choiceToOption(choices) {
    return choices.map(choice => ({ name: choice.name, value: choice.id }));
}