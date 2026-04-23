const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const GatheringManager = require('../utils/GatheringManager');
const { advanceTutorial } = require('../utils/checks');
const { addExperience } = require('../systems/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chop')
        .setDescription('Chop wood in the forest'),
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        await GatheringManager.execute(interaction, user, {
            actionName: 'chop',
            actionEmoji: '🪓',
            toolType: 'axe',
            resourceType: 'chop', // I should check if it's 'chop' or 'forage' in regions.js
            cooldownMs: 30 * 1000,
            color: '#8B4513'
        });

        // Tutorial check (handled after manager execution)
        const tutorialEmbeds = await advanceTutorial(user, 8, interaction, '100 Exp', async (u) => { 
            return await addExperience(u, 100, 'player'); 
        });

        if (tutorialEmbeds) {
            await interaction.followUp({ embeds: tutorialEmbeds, flags: [MessageFlags.Ephemeral] });
        }
    }
};