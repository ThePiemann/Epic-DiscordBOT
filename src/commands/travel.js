// src/commands/travel.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('travel')
        .setDescription('Travel between Sub-Regions within your current area'),

    async handleSelectMenu(interaction, action, args) {
        if (action !== 'sub') return;

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });

        const targetSubId = interaction.values[0];
        const currentRegionData = REGIONS[user.region];
        
        // Safety check for region data
        if (!currentRegionData) return interaction.reply({ content: 'Region data error.', flags: [MessageFlags.Ephemeral] });

        const targetSub = currentRegionData.subRegions.find(s => s.id === targetSubId);

        if (!targetSub) return interaction.reply('Invalid destination.');

        // Travel Logic
        const TRAVEL_TIME = 2; // 2 Minutes for sub-regions
        const arrivalTime = new Date(Date.now() + TRAVEL_TIME * 60000);    
        user.subRegion = targetSubId;
        user.travel.isTraveling = true;
        user.travel.destination = targetSub.name;
        user.travel.arrivalDate = arrivalTime;
        await user.save();

        return interaction.reply(`🥾 **Traveling...**\nMoving to **${targetSub.name}**.\nArriving in ${TRAVEL_TIME} minutes.`);
    },

    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        // 🛑 FIX: Initialize 'travel' object for existing users who don't have it yet
        if (!user.travel) {
            user.travel = {
                isTraveling: false,
                destination: null,
                arrivalDate: null
            };
            // We save immediately to ensure the DB is updated
            await user.save();
        }

        // 1. Check Travel Status
        if (user.travel.isTraveling) {
            const now = new Date();
            if (now < user.travel.arrivalDate) {
                const timeLeft = Math.ceil((user.travel.arrivalDate - now) / 60000);
                return interaction.reply({
                    content: `🚫 You are busy traveling to **${user.travel.destination}**. Arriving in ${timeLeft} minutes.`,
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                await user.checkTravel();
            }
        }

        // 3. Show Options
        let currentRegionData = REGIONS[user.region];
        
        // 🚨 MIGRATION FIX: If user is in an invalid region, move them to spawn.
        if (!currentRegionData) {
            user.region = 'verdant_expanse';
            user.subRegion = 'gentle_meads';
            user.travel.isTraveling = false;
            await user.save();
            
            currentRegionData = REGIONS['verdant_expanse'];
            // Notifying the user might be nice, but for now we just proceed safely
        }

        // Filter out current location
        const options = currentRegionData.subRegions
            .filter(sub => sub.id !== user.subRegion)
            .map(sub => ({
                label: sub.name,
                description: `Danger Lvl: ${sub.dangerLevel}`,
                value: sub.id
            }));

        if (options.length === 0) return interaction.reply({ content: 'No other sub-regions to travel to here.', flags: [MessageFlags.Ephemeral] });

        const select = new StringSelectMenuBuilder()
            .setCustomId('travel:sub')
            .setPlaceholder('Choose a sub-region...')
            .addOptions(options);

        const embed = new EmbedBuilder()
            .setTitle(`🥾 Travel: ${currentRegionData.name}`)
            .setDescription('Select a sub-region to travel to. Travel takes **2 minutes**.')
            .setColor('#2ecc71');

        await interaction.reply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(select)],
            flags: [MessageFlags.Ephemeral]
        });
    }
};