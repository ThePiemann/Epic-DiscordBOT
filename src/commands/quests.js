const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { getOrGenerateQuests } = require('../systems/questSystem');
const { addExperience } = require('../systems/leveling');
const LevelUpVisuals = require('../utils/LevelUpVisuals');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quests')
        .setDescription('View and claim your daily quests.')
        .addSubcommand(sub => sub.setName('view').setDescription('View active daily quests'))
        .addSubcommand(sub => sub.setName('claim').setDescription('Claim rewards for completed quests')),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        const questDoc = await getOrGenerateQuests(user.userId);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            const embed = new EmbedBuilder()
                .setTitle('📜 Daily Quests')
                .setColor('#3498db')
                .setDescription('Complete these tasks to earn rewards! Resets every 24 hours.');

            questDoc.dailyQuests.forEach((q, i) => {
                const status = q.claimed ? '✅ Claimed' : (q.completed ? '✨ Ready to Claim' : `⏳ Progress: ${q.currentAmount}/${q.targetAmount}`);
                const rewardParts = [
                    `💰 ${q.reward.gold} Gold`,
                    `✨ ${q.reward.xp || 0} XP`,
                    `🛡️ ${q.reward.classXp || 0} Class XP`
                ];
                if (q.reward.items.length > 0) {
                    rewardParts.push(`📦 ${q.reward.items.map(it => `${it.amount}x ${it.id.replace(/_/g, ' ')}`).join(', ')}`);
                }
                const rewardStr = rewardParts.join(', ');
                
                embed.addFields({
                    name: `${i + 1}. ${q.name} (${status})`,
                    value: `*${q.desc}*\n**Reward:** ${rewardStr}`,
                    inline: false
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'claim') {
            let totalGold = 0;
            let totalXp = 0;
            let totalClassXp = 0;
            let totalItems = [];
            let count = 0;

            questDoc.dailyQuests.forEach(q => {
                if (q.completed && !q.claimed) {
                    q.claimed = true;
                    totalGold += q.reward.gold;
                    totalXp += (q.reward.xp || 0);
                    totalClassXp += (q.reward.classXp || 0);
                    q.reward.items.forEach(it => {
                        user.addItem(it.id, it.amount);
                        totalItems.push(`${it.amount}x ${it.id.replace(/_/g, ' ')}`);
                    });
                    count++;
                }
            });

            if (count === 0) {
                return interaction.editReply('❌ No rewards available to claim. Complete your quests first!');
            }

            // Award Gold
            user.gold += totalGold;

            // Award Experience
            const playerSummary = await addExperience(user, totalXp, 'player');
            const classSummary = await addExperience(user, totalClassXp, 'class');

            const mergedSummary = {
                playerLevelsGained: playerSummary.playerLevelsGained,
                classLevelsGained: classSummary.classLevelsGained,
                oldStats: playerSummary.oldStats, // Initial stats
                newStats: classSummary.newStats   // Final stats after both updates
            };

            await user.save();
            await questDoc.save();

            const embed = new EmbedBuilder()
                .setTitle('🎁 Quests Claimed!')
                .setDescription(`You successfully claimed **${count}** quest rewards!`)
                .addFields(
                    { name: 'Total Rewards', value: `💰 ${totalGold} Gold\n✨ ${totalXp} XP\n🛡️ ${totalClassXp} Class XP`, inline: true },
                    { name: 'Items Received', value: totalItems.join('\n') || 'None', inline: true }
                )
                .setColor('#2ecc71');

            const embeds = [embed];
            if (mergedSummary.playerLevelsGained > 0 || mergedSummary.classLevelsGained > 0) {
                embeds.push(LevelUpVisuals.createLevelUpEmbed(user, mergedSummary));
            }

            return interaction.editReply({ embeds });
        }
    }
};