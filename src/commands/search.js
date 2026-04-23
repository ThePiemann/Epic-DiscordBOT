const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const GatheringManager = require('../utils/GatheringManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Look around specifically for dropped items, scrap, or hidden valuables.'),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        await GatheringManager.execute(interaction, user, {
            actionName: 'search',
            actionEmoji: '🔍',
            toolType: null,
            resourceType: 'search',
            cooldownMs: 2 * 60 * 1000,
            color: '#95a5a6',
            requireWilderness: false // Searching is allowed in cities!
        });
    }
};