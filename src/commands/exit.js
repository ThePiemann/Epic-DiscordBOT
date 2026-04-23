const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exit')
        .setDescription('Leave the current location and return to the wilds.'),

    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        if (!user.currentPlace) {
            return interaction.reply({ content: 'You are already in the wilds!', flags: [MessageFlags.Ephemeral] });
        }

        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const oldPlaceId = user.currentPlace;
        const place = subRegion.places ? subRegion.places.find(p => p.id === oldPlaceId) : null;
        const placeName = place ? place.name : oldPlaceId;
        
        user.currentPlace = null; // Back to Wilds
        await user.save();

        const embed = new EmbedBuilder()
            .setTitle('🌲 Returned to the Wilds')
            .setDescription(`You step out of **${placeName}** and return to the open wilderness of **${subRegion.name}**.`)
            .setColor('#2ecc71');

        await interaction.reply({ embeds: [embed] });
    }
};