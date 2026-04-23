const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');
const ENEMIES = require('../data/enemies');

function formatItemName(id) {
    return id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('location')
        .setDescription('View details about your current location and regional map.'),

    async execute(interaction) {
        await interaction.deferReply();

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
            return interaction.editReply('Use `/start` to create a character first!');
        }

        const regionId = user.region;
        const subRegionId = user.subRegion;

        const regionData = REGIONS[regionId];
        if (!regionData) {
            return interaction.editReply(`🚫 Error: Unknown region \`${regionId}\`.`);
        }

        const subRegionData = regionData.subRegions.find(s => s.id === subRegionId);
        if (!subRegionData) {
            return interaction.editReply(`🚫 Error: Unknown sub-region \`${subRegionId}\` in \`${regionData.name}\`.`);
        }

        // --- GATHER RESOURCES ---
        const resources = subRegionData.resources || {};
        
        const formatResourceList = (list) => {
            if (!list || list.length === 0) return 'None';
            return list.map(r => `• ${formatItemName(r.item)}`).join('\n');
        };

        const miningList = formatResourceList(resources.mine);
        const foragingList = formatResourceList(resources.forage);
        const fishingList = formatResourceList(resources.fish);

        // --- GATHER ENEMIES ---
        const areaEnemies = ENEMIES.filter(e => 
            e.region === regionId && e.sub_region === subRegionId
        );

        let enemyDisplay = 'None';
        if (areaEnemies.length > 0) {
            enemyDisplay = areaEnemies.map(e => `• **${e.name}** (Lv. ${e.level || '?'})`).join('\n');
        }

        const { timeOfDay, weather } = require('../systems/timeWeather').getCurrentTimeAndWeather();

        // --- MINI-MAP ---
        const mapLines = subRegionData.map || ["*No map available for this area.*"];
        const mapDisplay = "```\n" + mapLines.join('\n') + "\n```";

        // --- BUILD EMBED ---
        const embed = new EmbedBuilder()
            .setTitle(`📍 ${subRegionData.name}`)
            .setDescription(`*${subRegionData.description}*\n\n${mapDisplay}`)
            .setColor('#2ecc71')
            .addFields(
                { name: '🕒 Time & Weather', value: `${timeOfDay} | ${weather}`, inline: false },
                { name: '⚔️ Local Enemies', value: enemyDisplay, inline: false },
                { name: '⛏️ Mining', value: miningList, inline: true },
                { name: '🌿 Foraging', value: foragingList, inline: true },
                { name: '🎣 Fishing', value: fishingList, inline: true }
            );

        if (user.travel.isTraveling) {
            const now = new Date();
            const timeLeft = Math.ceil((user.travel.arrivalDate - now) / 60000);
            embed.setFooter({ text: `👣 Traveling to ${user.travel.destination.replace(/_/g, ' ').toUpperCase()}... (${timeLeft}m left)` });
        } else {
            const currentPlaceName = user.currentPlace 
                ? (subRegionData.places?.find(p => p.id === user.currentPlace)?.name || user.currentPlace)
                : 'The Wilds';
            embed.setFooter({ text: `Current Status: In ${currentPlaceName}` });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};