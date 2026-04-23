const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const GatheringManager = require('../utils/GatheringManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Mine for ores in your current region.'),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        await GatheringManager.execute(interaction, user, {
            actionName: 'mine',
            actionEmoji: '⛏️',
            toolType: 'pickaxe',
            resourceType: 'mine',
            cooldownMs: 30 * 1000,
            color: '#708090'
        });
    }
};