const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const GatheringManager = require('../utils/GatheringManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forage')
        .setDescription('Scour the current area for materials and food.'),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        await GatheringManager.execute(interaction, user, {
            actionName: 'forage',
            actionEmoji: '🌿',
            toolType: null,
            resourceType: 'forage',
            cooldownMs: 2 * 60 * 1000, // Reduced from randomized for consistency in manager
            color: '#8B4513'
        });
    }
};