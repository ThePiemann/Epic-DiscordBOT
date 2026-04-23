const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { calculateEffectiveStats } = require('../systems/stats');
const LevelUpVisuals = require('../utils/LevelUpVisuals');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('allocate')
        .setDescription('Spend your unspent stat points to improve your character!')
        .addStringOption(option =>
            option.setName('stat')
                .setDescription('The stat you want to increase')
                .setRequired(true)
                .addChoices(
                    { name: '💪 Strength (ATK +2, DEF +1)', value: 'str' },
                    { name: '🧠 Intellect (MATK +2, MDEF +1, Mana +5)', value: 'int' },
                    { name: '🔋 Constitution (HP +10, Stamina +2)', value: 'con' },
                    { name: '🏃 Dexterity (SPD +0.5, Crit DMG +0.5%)', value: 'dex' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The number of points to allocate (max 10 points at a time)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
            return interaction.editReply('Use `/start` to create a character first!');
        }

        const statToIncrease = interaction.options.getString('stat');
        const amount = interaction.options.getInteger('amount');
        const statName = statToIncrease.toUpperCase();
        
        // 1. Validation Checks
        if (amount < 1) return interaction.editReply('You must allocate at least 1 point.');
        if (amount > user.unspentPoints) return interaction.editReply(`You only have **${user.unspentPoints}** unspent points.`);
        if (amount > 10) return interaction.editReply('For safety, you can only allocate a maximum of 10 points at once.');

        // 2. Capture Stats BEFORE
        const oldStats = calculateEffectiveStats(user);

        // 3. Perform Allocation
        if (!user.allocatedStats) {
            user.allocatedStats = { str: 0, int: 0, con: 0, dex: 0 };
        }
        
        user.allocatedStats[statToIncrease] = (user.allocatedStats[statToIncrease] || 0) + amount;
        user.unspentPoints -= amount;

        // 4. Capture Stats AFTER
        const newStats = calculateEffectiveStats(user);

        await user.save();

        const embed = new EmbedBuilder()
            .setTitle('✅ Points Allocated')
            .setDescription(`Successfully allocated **${amount}** points to **${statName}**!\nUnspent points remaining: **${user.unspentPoints}**`)
            .setColor('#2ecc71');

        const growthEmbed = LevelUpVisuals.createLevelUpEmbed(user, {
            playerLevelsGained: 0,
            classLevelsGained: 0,
            oldStats,
            newStats
        });
        growthEmbed.setTitle('📈 Stat Improvements'); // Override the title for allocation

        return interaction.editReply({ embeds: [embed, growthEmbed] });
    }
};