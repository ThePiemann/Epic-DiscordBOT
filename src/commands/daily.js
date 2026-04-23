const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

// Assuming these item IDs are correct from your shopItems.js
const HEALTH_POTION_ID = 'small_potion';
const MANA_POTION_ID = 'mana_vial';

// --- DAILY STREAK REWARDS CONFIG ---
const DAILY_REWARDS = {
    1: { gold: 100, items: [] },
    2: { gold: 150, items: [] },
    3: { gold: 200, items: [{ id: HEALTH_POTION_ID, amount: 1 }] },
    4: { gold: 250, items: [] },
    5: { gold: 300, items: [{ id: HEALTH_POTION_ID, amount: 1 }, { id: MANA_POTION_ID, amount: 1 }] },
    6: { gold: 400, items: [] },
    // Day 7 and onward (this is the weekly cap/looping reward)
    7: { gold: 500, items: [{ id: HEALTH_POTION_ID, amount: 2 }, { id: MANA_POTION_ID, amount: 1 }] },
};
// ----------------------------------

// Time constants in milliseconds
const COOLDOWN_24H = 24 * 60 * 60 * 1000;
const STREAK_WINDOW_48H = 48 * 60 * 60 * 1000;

// Helper function to capitalize and replace underscores for display
function formatItemId(itemId) {
    return itemId.replace(/_/g, ' ').toUpperCase();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward and maintain your 7-day streak!'),
    async execute(interaction) {
        // 1. Defer Reply with flags: MessageFlags.Ephemeral
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const userId = interaction.user.id;
        // User.findOne will now retrieve the new dailyStreak and lastDailyClaimDate fields
        const user = await User.findOne({ userId });

        if (!user) {
            return interaction.editReply('Use `/start` to create a character first!');
        }

        const now = new Date();
        const lastClaimDate = user.lastDailyClaimDate; // Fetched from the updated model

        let streakMessage = "";

        // --- 24-HOUR COOLDOWN CHECK (Hard Lock) ---
        // Prevents claiming multiple times within a single 24-hour period
        if (lastClaimDate && (now.getTime() - lastClaimDate.getTime()) < COOLDOWN_24H) {
            const remaining = COOLDOWN_24H - (now.getTime() - lastClaimDate.getTime());
            
            // Format time remaining for user display
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            return interaction.editReply({ 
                content: `⏳ You are on cooldown! You can claim your next reward in **${hours}h ${minutes}m ${seconds}s**.`,
                flags: [MessageFlags.Ephemeral] 
            });
        }
        
        // --- STREAK LOGIC CHECK ---
        let currentStreak = user.dailyStreak;

        if (!lastClaimDate) {
            // Case 1: First ever claim
            currentStreak = 1;
            streakMessage = "✨ **New adventurer!** Start your 7-day streak today!";
        } else {
            const timeSinceLastClaim = now.getTime() - lastClaimDate.getTime();
            
            if (timeSinceLastClaim >= STREAK_WINDOW_48H) {
                // Case 2: Claimed after 48 hours: streak broken
                if (currentStreak > 0) {
                    streakMessage = `💔 **Streak Broken!** Your ${currentStreak}-day streak ended. Restarting streak at day 1.`;
                } else {
                    streakMessage = "✨ **New day, new start!** Restarting streak at day 1.";
                }
                currentStreak = 1;
            } else {
                // Case 3: Claimed within the 24h-48h window: streak maintained/incremented
                // We only increment if the time is > 24 hours (which is handled by the initial check)
                currentStreak = Math.min(user.dailyStreak + 1, 7); // Cap the visual display at 7
                
                // If the user was already on day 7, they maintain it. Otherwise, they increment.
                if (user.dailyStreak < 7) {
                    streakMessage = `🔥 **Streak Maintained!** You are now on Day **${currentStreak}**!`;
                } else {
                    streakMessage = `⭐ **Weekly Bonus!** You maintained your 7-day streak. Enjoy the rewards!`;
                }
            }
        }
        
        // Determine the reward to give (Day 7 reward is the cap/looping reward)
        const rewardDay = currentStreak === 0 ? 1 : Math.min(currentStreak, 7);
        const reward = DAILY_REWARDS[rewardDay];

        // --- Apply Reward ---
        user.gold += reward.gold;
        let itemMsg = '';
        
        for (const item of reward.items) {
            // Add item using the model helper method
            user.addItem(item.id, item.amount); 
            itemMsg += `\n🎁 Received **${item.amount}x ${formatItemId(item.id)}**!`;
        }

        // --- Update User State ---
        user.dailyStreak = currentStreak;
        user.lastDailyClaimDate = now;
        
        // Save the hard cooldown date in the cooldowns map (for backward compatibility)
        user.cooldowns.set('daily', now); 

        await user.save();
        
        // --- Next Reward Calculation for Embed ---
        let nextRewardDay = currentStreak < 7 ? currentStreak + 1 : 7;
        let nextReward = DAILY_REWARDS[nextRewardDay];
        
        // Format the next reward details
        let nextRewardDetails = `**Day ${nextRewardDay}:** ${nextReward.gold} Gold`;
        if (nextReward.items.length > 0) {
            nextRewardDetails += ` + ${nextReward.items.map(i => `${i.amount}x ${formatItemId(i.id)}`).join(', ')}`;
        }
        
        // Final Response Embed
        const embed = new EmbedBuilder()
            .setTitle(`Daily Reward - Day ${rewardDay} Claimed! ☀️`)
            .setColor('#2ecc71') // Green color for success
            .setDescription(
                `**Current Streak: ${user.dailyStreak} Day(s)**\n` +
                `${streakMessage}\n\n` +
                `**You received:**\n` +
                `💰 **${reward.gold} Gold**!` +
                `${itemMsg}`
            )
            .addFields({
                name: `🔥 Next Reward (Day ${nextRewardDay})`,
                value: nextRewardDetails,
                inline: false
            })
            // Use current time + 24 hours as the next ready time for the user's clock
            .setFooter({ text: `Next claim ready:` })
            .setTimestamp(now.getTime() + COOLDOWN_24H);

        await interaction.editReply({ embeds: [embed] });
    },
};