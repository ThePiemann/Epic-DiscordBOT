const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('carriage')
        .setDescription('Travel instantly to another town for a fee.'),

    async handleSelectMenu(interaction, action, args) {
        if (action !== 'select') return;

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });

        const targetId = interaction.values[0];
        const COST = 50;

        if (user.gold < COST) return interaction.reply({ content: "You can't afford the carriage.", flags: [MessageFlags.Ephemeral] });

        // Update Location
        user.gold -= COST;
        user.subRegion = targetId;
        user.currentPlace = null; // Drop them at the entrance of the new zone
        
        // Safety check for travel object
        if (user.travel) {
            user.travel.isTraveling = false;
        }
        
        await user.save();
        
        const region = REGIONS[user.region];
        const subRegionData = region.subRegions.find(s => s.id === targetId);
        await interaction.reply(`🐴 **Hiyah!** You take a bumpy ride and arrive at **${subRegionData.name}** instantly.`);
    },

    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        // 1. Must be in a Town (Carriage Stop)
        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        
        // Find if any of the places the player is in has 'carriage'
        // If currentPlace is null, they aren't 'entered' anywhere specific.
        const currentPlaceId = user.currentPlace;
        const place = subRegion.places ? subRegion.places.find(p => p.id === currentPlaceId) : null;

        if (!place || !place.features.includes('carriage')) {
            return interaction.reply({ content: '🚏 There is no Carriage Stop here. You must be inside a town with a carriage feature.', flags: [MessageFlags.Ephemeral] });
        }

        // 2. Find Destinations (Other SubRegions in THIS region)
        const destinations = region.subRegions
            .filter(s => s.id !== user.subRegion) 
            .map(s => ({
                label: s.name,
                description: 'Cost: 50 Gold',
                value: s.id
            }));

        if (destinations.length === 0) return interaction.reply({ content: 'No destinations available.', flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('carriage:select')
                .setPlaceholder('Where to?')
                .addOptions(destinations)
        );

        await interaction.reply({ content: '🐴 **Carriage Service**\nWhere would you like to go?', components: [row] });
    }
};