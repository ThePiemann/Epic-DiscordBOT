const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const REGIONS = require('../data/regions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('View the location and details of all known dungeons.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🗺️ Known Dungeons')
            .setColor('#e74c3c')
            .setDescription('Explore the world to uncover more hidden dangers.');

        for (const regionId in REGIONS) {
            const region = REGIONS[regionId];
            region.subRegions.forEach(subRegion => {
                if (subRegion.places) {
                    const dungeons = subRegion.places.filter(p => p.type === 'dungeon');
                    dungeons.forEach(dungeon => {
                        embed.addFields({
                            name: `💀 ${dungeon.name}`,
                            value: `**Region:** ${region.name}
**Sub-Region:** ${subRegion.name}
**Level Range:** ${region.levelRange[0]}-${region.levelRange[1]}
**Description:** ${dungeon.description}`,
                            inline: false
                        });
                    });
                }
            });
        }

        if (embed.data.fields && embed.data.fields.length === 0) {
            embed.setDescription('No dungeons have been discovered in these regions yet.');
        }

        return interaction.reply({ embeds: [embed] });
    }
};
