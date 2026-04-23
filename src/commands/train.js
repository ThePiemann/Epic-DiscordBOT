const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { checkStatus } = require('../utils/checks');
const { addExperience } = require('../systems/leveling');
const { getNextLevelExp } = require('../systems/xp');
const LevelUpVisuals = require('../utils/LevelUpVisuals');

function calculateXpGain(level) {
    // Base 50 XP + 10 per level
    return 50 + (level * 10);
}

function calculateNextCooldown() {
    // 5 minutes from now
    return new Date(Date.now() + 5 * 60 * 1000);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('train')
        .setDescription('Spend stamina to gain Class EXP and improve skills.'),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }); 

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
            return interaction.editReply('Use `/start` to create a character first!');
        }

        if (!(await checkStatus(interaction, user))) return;

        const now = Date.now();
        const trainCooldown = user.cooldowns.get('train');
        const minCooldownMs = 5 * 60 * 1000;

        // 1. Check Cooldown
        if (trainCooldown && (now - trainCooldown.getTime()) < minCooldownMs) {
            const remaining = trainCooldown.getTime() + minCooldownMs - now;
            const seconds = Math.ceil(remaining / 1000);
            return interaction.editReply({ 
                content: `⏳ You are still recovering from your last training session! Wait **${seconds}s**.`
            });
        }

        // 2. Calculate XP Gain
        const gainedXp = calculateXpGain(user.level);
        
        // 3. Centralized Experience Addition
        const summary = await addExperience(user, gainedXp, 'both');
        
        let replyMessage = `You trained rigorously and gained **${gainedXp} XP**!`;
        const embeds = [];

        // 4. Set Next Cooldown
        const nextCooldown = calculateNextCooldown();
        user.cooldowns.set('train', nextCooldown);

        await user.save();

        const cooldownTimestamp = `<t:${Math.floor(nextCooldown.getTime() / 1000)}:R>`;
        const finalNextLevelExp = getNextLevelExp(user.level);

        const embed = new EmbedBuilder()
            .setTitle('🏋️ Rigorous Training Complete')
            .setDescription(replyMessage)
            .setColor('#4CAF50')
            .addFields(
                { name: '✨ Progress', value: `Level **${user.level}** | XP **${user.exp} / ${finalNextLevelExp}**`, inline: true },
                { name: '⏳ Next Available', value: cooldownTimestamp, inline: true }
            );

        embeds.push(embed);

        if (summary.playerLevelsGained > 0 || summary.classLevelsGained > 0) {
            embeds.push(LevelUpVisuals.createLevelUpEmbed(user, summary));
        }

        await interaction.editReply({ embeds });
    },
};