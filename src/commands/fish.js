const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const GatheringManager = require('../utils/GatheringManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Cast your line to fish in the current waters.'),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        await GatheringManager.execute(interaction, user, {
            actionName: 'fish',
            actionEmoji: '🎣',
            toolType: 'rod',
            resourceType: 'fish',
            cooldownMs: 2 * 60 * 1000,
            color: '#1E90FF'
        });
    }
};