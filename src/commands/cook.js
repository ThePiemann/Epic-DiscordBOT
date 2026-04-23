const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const CONSUMABLES = require('../data/consumables');
const { checkStatus } = require('../utils/checks');
const { addActivityXp } = require('../systems/xp');
const { findItem } = require('../utils/itemUtils');
const LevelUpVisuals = require('../utils/LevelUpVisuals');

const ITEMS_PER_PAGE = 10;

function getAllCookables() {
    return Object.values(CONSUMABLES).filter(c => c.cookable);
}

function getCookPage(page = 0) {
    const cookables = getAllCookables();
    const maxPages = Math.ceil(cookables.length / ITEMS_PER_PAGE) - 1;
    page = Math.max(0, Math.min(page, maxPages));

    const startIndex = page * ITEMS_PER_PAGE;
    const itemsOnPage = cookables.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle('🍳 Cooking Recipes')
        .setColor('#e67e22');

    if (itemsOnPage.length === 0) {
        embed.setDescription('No cooking recipes found.');
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
                .setCustomId(`cook:page:${page - 1}`)
                .setLabel('⬅️ Prev')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`cook:page:${page + 1}`)
                .setLabel('Next ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= maxPages),
        );

    return { embed, row };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cook')
        .setDescription('Cook meals using gathered materials')
        .addSubcommand(sub => 
            sub.setName('list')
                .setDescription('View all cooking recipes.')
        )
        .addSubcommand(sub =>
            sub.setName('make')
                .setDescription('Cook a meal.')
                .addStringOption(option => 
                    option.setName('meal_id')
                        .setDescription('The Name or ID of the meal')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const cookables = getAllCookables();
        const choices = cookables.filter(item => 
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
        const { embed, row } = getCookPage(targetPage);
        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const user = await User.findOne({ userId: interaction.user.id });

        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        if (sub === 'list') {
            const { embed, row } = getCookPage(0);
            return interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
        }

        if (sub === 'make') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const itemInput = interaction.options.getString('meal_id');

            if (!(await checkStatus(interaction, user))) return;

            const meal = findItem(itemInput);

            if (!meal || !meal.cookable) {
                return interaction.editReply({ content: `❌ Meal \`${itemInput}\` not found or not cookable.` });
            }

            const recipe = meal.recipe;
            if (!recipe) return interaction.editReply({ content: 'That meal cannot be cooked.' });

            let missing = [];
            for (const [material, amount] of Object.entries(recipe)) {
                const userAmount = user.inventory.get(material) || 0;
                if (userAmount < amount) {
                    const friendlyMat = material.replace(/_/g, ' ');
                    missing.push(`${amount - userAmount}x ${friendlyMat}`);
                }
            }

            if (missing.length > 0) {
                const recipeList = Object.entries(recipe)
                    .map(([mat, amt]) => `- ${amt}x ${mat.replace(/_/g, ' ')}`)
                    .join('\n');

                return interaction.editReply({ 
                    content: `❌ **Not enough ingredients!**\n\n**Recipe for ${meal.name}:**\n${recipeList}\n\n**Missing:**\n- ${missing.join('\n- ')}`
                });
            }

            for (const [material, amount] of Object.entries(recipe)) {
                user.removeItem(material, amount);
            }

            user.addItem(meal.id, 1);
            const { xpAmount, summary } = await addActivityXp(user, 'cook');
            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('🍳 Cooking Successful')
                .setDescription(`You cooked a delicious **${meal.name}**!`)
                .addFields(
                    { name: 'Effect', value: meal.description, inline: true },
                    { name: 'Experience', value: `+${xpAmount} XP`, inline: true }
                )
                .setColor('#e67e22');

            const embeds = [embed];
            if (summary.playerLevelsGained > 0 || summary.classLevelsGained > 0) {
                embeds.push(LevelUpVisuals.createLevelUpEmbed(user, summary));
            }

            return interaction.editReply({ embeds });
        }
    }
};