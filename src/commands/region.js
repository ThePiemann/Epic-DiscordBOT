// src/commands/region.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('region')
        .setDescription('View current region or travel to a new Main Region'),

    async handleSelectMenu(interaction, action, args) {
        if (action !== 'travel') return;

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });

        const targetRegionId = interaction.values[0];
        const targetRegion = REGIONS[targetRegionId];

        if (!targetRegion) return interaction.reply({ content: 'Invalid region.', flags: [MessageFlags.Ephemeral] });

        // CHECK REQUIREMENTS
        if (targetRegion.requirements && user.level < targetRegion.requirements.level) {
            return interaction.reply({ 
                content: `🔒 **Access Denied**\nYou need to be **Level ${targetRegion.requirements.level}** to enter ${targetRegion.name}.\nCurrent Level: ${user.level}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // Setup Travel
        const TRAVEL_TIME_MINUTES = 3; // Main region travel takes longer
        const arrivalTime = new Date(Date.now() + TRAVEL_TIME_MINUTES * 60000);

        // Update user's location
        user.region = targetRegionId;
        user.subRegion = targetRegion.subRegions[0].id; // Default to first sub-region
        
        // Set travel status
        user.travel.isTraveling = true;
        user.travel.destination = targetRegion.name;
        user.travel.arrivalDate = arrivalTime;
        await user.save();

        return interaction.reply({ 
            content: `🚶 **Journey Started!**\nYou are traveling to **${targetRegion.name}**.\nIt will take ${TRAVEL_TIME_MINUTES} minutes.\n*(Commands are locked while traveling)*` 
        });
    },
        
    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        // 🛑 FIX: Initialize 'travel' object for existing users who don't have it yet.
        if (!user.travel) {
            user.travel = {
                isTraveling: false,
                destination: null,
                arrivalDate: null
            };
            await user.save();
        }

        // 1. Check if already traveling
        if (user.travel.isTraveling) {
            const now = new Date();
            if (now < user.travel.arrivalDate) {
                const timeLeft = Math.ceil((user.travel.arrivalDate - now) / 60000);
                return interaction.reply({ 
                    content: `🚫 You are currently traveling to **${user.travel.destination}**. Arriving in ${timeLeft} minutes.`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            } else {
                // Travel finished, resolve it
                await user.checkTravel(); 
            }
        }

        let currentRegion = REGIONS[user.region];

        // 🚨 MIGRATION FIX: If user is in an invalid region (old data), move them to spawn.
        if (!currentRegion) {
            user.region = 'verdant_expanse';
            user.subRegion = 'gentle_meads';
            user.travel.isTraveling = false; // Reset travel to avoid getting stuck
            await user.save();
            
            currentRegion = REGIONS['verdant_expanse'];
            console.log(`Migrated user ${user.username} to Verdant Expanse.`);
        }

        // 3. Display Menu (Normal Command)
        const connectedRegions = currentRegion.connections || [];
        
        let selectMenu;
        if (connectedRegions.length > 0) {
            selectMenu = new StringSelectMenuBuilder()
                .setCustomId('region:travel')
                .setPlaceholder('Select a region to travel to...')
                .addOptions(connectedRegions.map(rId => {
                    const r = REGIONS[rId];
                    return {
                        label: r.name,
                        description: `Lvl ${r.levelRange[0]}-${r.levelRange[1]} | ${r.difficulty}`,
                        value: rId
                    };
                }));
        }

        const embed = new EmbedBuilder()
            .setTitle(`🗺️ ${currentRegion.name}`)
            .setDescription(`**${currentRegion.description}**\n\n**Difficulty:** ${currentRegion.difficulty}\n**Level Range:** ${currentRegion.levelRange.join('-')}`)
            .addFields({ 
                name: '📍 Current Sub-Region', 
                value: user.subRegion ? user.subRegion.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN', 
                inline: true 
            })
            .setColor('#3498db');

        const components = [];
        if (selectMenu) components.push(new ActionRowBuilder().addComponents(selectMenu));

        await interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
    }
};