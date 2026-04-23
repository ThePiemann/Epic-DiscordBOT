const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

const JOBS = [
    { name: 'Stable Hand', salary: 50, minLevel: 1 },
    { name: 'Guard Duty', salary: 100, minLevel: 10 },
    { name: 'Magic Tutor', salary: 250, minLevel: 20 }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('job')
        .setDescription('Work a shift to earn gold.')
        .addSubcommand(sub => sub.setName('start').setDescription('Start a shift').addIntegerOption(o => o.setName('hours').setDescription('1-8 Hours').setRequired(true)))
        .addSubcommand(sub => sub.setName('claim').setDescription('Finish work and get paid')),

    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });
        
        const sub = interaction.options.getSubcommand();

        // --- CLAIM PAYCHECK ---
        if (sub === 'claim') {
            if (!user.job.isActive) return interaction.reply('You are not working!');

            const now = new Date();
            const finishTime = new Date(user.job.startTime.getTime() + (user.job.hours * 60 * 60 * 1000));

            if (now < finishTime) {
                const remaining = Math.ceil((finishTime - now) / 60000);
                return interaction.reply(`⏳ You are still on shift! Come back in **${remaining} minutes**.`);
            }

            const payout = user.job.salary * user.job.hours;
            user.gold += payout;
            user.job.isActive = false;
            user.job.startTime = null;
            await user.save();

            return interaction.reply(`💰 Shift complete! You earned **${payout} Gold**.`);
        }

        // --- START SHIFT ---
        if (sub === 'start') {
            if (user.job.isActive) return interaction.reply('You already have a job active! Use `/job claim`.');
            if (user.travel.isTraveling) return interaction.reply('You cannot work while traveling.');

            // Find best job based on level
            const bestJob = JOBS.slice().reverse().find(j => user.level >= j.minLevel);
            const hours = interaction.options.getInteger('hours');

            if (hours < 1 || hours > 8) return interaction.reply('Shifts must be between 1 and 8 hours.');

            user.job.isActive = true;
            user.job.startTime = new Date();
            user.job.hours = hours;
            user.job.salary = bestJob.salary;
            
            await user.save();

            return interaction.reply(`⚒️ You started working as a **${bestJob.name}** for ${hours} hours.\nCome back later to \
/job claim **${bestJob.salary * hours}g**.`);
        }
    }
};