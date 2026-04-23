const { EmbedBuilder } = require('discord.js');

class LevelUpVisuals {
    /**
     * Creates a level-up embed.
     * @param {Object} user - User document
     * @param {Object} summary - Summary from addExperience
     * @returns {EmbedBuilder}
     */
    static createLevelUpEmbed(user, summary) {
        const { playerLevelsGained, classLevelsGained, oldStats, newStats } = summary;
        console.log(`[Visuals] Creating LevelUp Embed for ${user.username}. PlayerGained: ${playerLevelsGained}, ClassGained: ${classLevelsGained}`);
        
        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTimestamp();

        if (playerLevelsGained > 0 && classLevelsGained > 0) {
            embed.setTitle('🎊 Double Level Up!')
                 .setDescription(`You reached **Player Level ${user.level}** and your **${user.class}** class reached **Level ${user.classLevel}**!`);
        } else if (playerLevelsGained > 0) {
            embed.setTitle('🎉 Player Level Up!')
                 .setDescription(`You reached **Level ${user.level}**!`);
        } else if (classLevelsGained > 0) {
            embed.setTitle('🛡️ Class Rank Up!')
                 .setDescription(`Your **${user.class}** class reached **Level ${user.classLevel}**!`);
        } else {
            // Fallback just in case it's called incorrectly
            embed.setTitle('✨ Leveling Progress')
                 .setDescription(`Your experience has increased!`);
        }

        if (oldStats && newStats) {
            const statLines = [];
            const trackedStats = [
                { key: 'maxHp', name: 'HP', emoji: '❤️' },
                { key: 'maxMana', name: 'Mana', emoji: '💧' },
                { key: 'maxStamina', name: 'Stamina', emoji: '💪' },
                { key: 'atk', name: 'ATK', emoji: '⚔️' },
                { key: 'def', name: 'DEF', emoji: '🛡️' },
                { key: 'matk', name: 'MATK', emoji: '🔮' },
                { key: 'mdef', name: 'MDEF', emoji: '💠' },
                { key: 'spd', name: 'SPD', emoji: '👟' }
            ];

            trackedStats.forEach(s => {
                const oldVal = Math.floor(oldStats[s.key] || 0);
                const newVal = Math.floor(newStats[s.key] || 0);
                if (newVal > oldVal) {
                    statLines.push(`${s.emoji} **${s.name}:** ${oldVal} ➡️ **${newVal}** (+${newVal - oldVal})`);
                }
            });

            if (statLines.length > 0) {
                embed.addFields({ name: '📈 Stat Growth', value: statLines.join('\n') });
            } else {
                // If Math.floor hid small gains, show a generic message
                embed.addFields({ name: '📈 Stat Growth', value: 'Your attributes have improved slightly!' });
            }
        }

        if (playerLevelsGained > 0) {
            embed.addFields({ name: '✨ Rewards', value: `• +${playerLevelsGained * 5} Attribute Points\n• HP, Mana, and Stamina fully restored!` });
        } else if (classLevelsGained > 0) {
            embed.addFields({ name: '✨ Rewards', value: `• HP, Mana, and Stamina fully restored!` });
        }

        return embed;
    }
}

module.exports = LevelUpVisuals;