const { MessageFlags, EmbedBuilder } = require('discord.js');
const LevelUpVisuals = require('./LevelUpVisuals');

async function checkStatus(interaction, user) {
    // 1. Check Travel
    if (user.travel.isTraveling) {
        const now = new Date();
        if (now < user.travel.arrivalDate) {
            const timeLeft = Math.ceil((user.travel.arrivalDate - now) / 60000);
            
            // Handle both reply and editReply scenarios
            const replyOptions = { 
                content: `🚫 You cannot do this while traveling! Arriving at **${user.travel.destination}** in ${timeLeft} mins.`, 
                flags: [MessageFlags.Ephemeral] 
            };
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(replyOptions);
            } else {
                await interaction.reply(replyOptions);
            }
            return false; // Return false to stop execution
        } else {
            await user.checkTravel(); // Travel finished, allow execution
        }
    }
    
    // 2. Check Combat (for gathering commands)
    if (user.inCombat) {
         const replyOptions = { content: "🚫 You cannot do this while in combat!", flags: [MessageFlags.Ephemeral] };
         
         if (interaction.deferred || interaction.replied) {
             await interaction.editReply(replyOptions);
         } else {
             await interaction.reply(replyOptions);
         }
         return false;
    }

    return true; // All good
}

/**
 * Advances the tutorial if the user is on the correct step.
 * Returns an embed if a step was completed, otherwise null.
 */
async function advanceTutorial(user, stepIndex, interaction, rewardText, rewardFn) {
    if (user.tutorialStep === stepIndex) {
        user.tutorialStep++;
        let rewardResult = null;
        if (rewardFn) {
            rewardResult = await rewardFn(user);
        }
        await user.save();

        const embed = new EmbedBuilder()
            .setTitle('🎊 Tutorial Step Completed!')
            .setDescription(`**Step ${stepIndex + 1} is finished!**\n\n🎁 **Reward:** ${rewardText}\n\n*Use \`/tutorial\` to discover your next task.*`)
            .setColor('#f1c40f')
            .setTimestamp();
        
        // If a level up summary was returned, create a second embed or modify this one
        if (rewardResult && (rewardResult.playerLevelsGained > 0 || rewardResult.classLevelsGained > 0)) {
            const levelUpEmbed = LevelUpVisuals.createLevelUpEmbed(user, rewardResult);
            // We return both or just merge some info. Returning an array of embeds is best.
            return [embed, levelUpEmbed];
        }

        return [embed];
    }
    return null;
}

module.exports = { checkStatus, advanceTutorial };