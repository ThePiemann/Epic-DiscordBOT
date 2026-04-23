const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');
const { advanceTutorial } = require('../utils/checks');
const { addExperience } = require('../systems/leveling');
const { triggerRandomEvent } = require('../systems/eventSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('explore')
        .setDescription('Look for places of interest in your current area.'),

    async execute(interaction) {
        // ALWAYS defer first to avoid "Interaction Failed"
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const user = await User.findOne({ userId: interaction.user.id });
            if (!user) {
                return interaction.editReply({ content: 'Use `/start` first!' });
            }

            // 📖 Tutorial Progress: Step 3 (Index 2) - 100 Exp
            let tutorialEmbed = null;
            try {
                tutorialEmbed = await advanceTutorial(user, 2, interaction, '100 Exp', async (u) => { 
                    return await addExperience(u, 100, 'player'); 
                });
            } catch (tutError) {
                console.error('Tutorial Advancement Error in Explore:', tutError);
            }

            // --- RANDOM EXPLORATION EVENT (15% Chance) ---
            let eventEmbed = null;
            if (Math.random() < 0.15) {
                eventEmbed = await triggerRandomEvent(interaction, user);
            }

            // Get Region Data
            const region = REGIONS[user.region];
            if (!region) {
                return interaction.editReply({ content: `❌ Error: Region **${user.region}** not found in database.` });
            }

            const subRegion = region.subRegions.find(s => s.id === user.subRegion);
            if (!subRegion) {
                return interaction.editReply({ content: `❌ Error: Sub-Region **${user.subRegion}** not found in **${region.name}**.` });
            }

            const currentPlaceName = user.currentPlace 
                ? (subRegion.places?.find(p => p.id === user.currentPlace)?.name || user.currentPlace)
                : 'The Wilds';

            const embed = new EmbedBuilder()
                .setTitle(`🔭 Exploring ${subRegion.name}`)
                .setDescription(`You are currently in: **${currentPlaceName}**\n\nYou spot several locations nearby:`)
                .setColor('#2ecc71');

            const row = new ActionRowBuilder();

            if (user.currentPlace) {
                embed.addFields({ name: '🌲 The Wilds', value: '*The open wilderness surrounding you.*', inline: false });
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('enter:place:wilds')
                        .setLabel('Return to Wilds')
                        .setStyle(ButtonStyle.Success)
                );
            }

            const placesToShow = (subRegion.places || []).slice(0, row.components.length > 0 ? 4 : 5);

            placesToShow.forEach(place => {
                if (place.id === user.currentPlace) return; 

                let icon = '📍';
                if (place.type === 'town' || place.type === 'city') icon = '🏠';
                if (place.type === 'dungeon') icon = '💀';

                embed.addFields({ name: `${icon} ${place.name}`, value: `*${place.description}*`, inline: false });

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`enter:place:${place.id}`)
                        .setLabel(`Enter ${place.name}`)
                        .setStyle(ButtonStyle.Primary)
                );
            });

            const embeds = [embed];
            if (eventEmbed) embeds.unshift(eventEmbed); // Event shows at top
            if (tutorialEmbed) embeds.push(...tutorialEmbed); // Reward embed at bottom

            if (row.components.length > 0) {
                return interaction.editReply({ embeds, components: [row] });
            } else {
                return interaction.editReply({ embeds });
            }
        } catch (error) {
            console.error('Explore Command Critical Error:', error);
            const errorMsg = 'An unexpected error occurred while exploring. Please try again later.';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};