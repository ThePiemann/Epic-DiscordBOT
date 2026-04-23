const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const GlobalState = require('../models/GlobalState');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost')
        .setDescription('View currently active global server-wide boosts.'),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        let global = await GlobalState.findOne({ key: 'main' });
        if (!global) {
            return interaction.editReply('✨ No global boosts are currently active.');
        }

        const now = new Date();
        const activeBoosts = [];

        const checkBoost = (type, label, emoji) => {
            const multiplier = global.boosts[type];
            const expires = global.boosts[`${type}_expires`];

            if (multiplier > 1) {
                const isExpired = expires && now > expires;
                if (!isExpired) {
                    let text = `${emoji} **${label}**: \`${multiplier}x\``;
                    if (expires) {
                        text += ` (Expires <t:${Math.floor(expires.getTime() / 1000)}:R>)`;
                    } else {
                        text += ' (Permanent)';
                    }
                    activeBoosts.push(text);
                }
            }
        };

        checkBoost('xp', 'Experience', '🆙');
        checkBoost('gathering', 'Gathering Yield', '🌿');
        checkBoost('gold', 'Gold Rewards', '💰');
        checkBoost('dropRate', 'Rare Drop Rate', '💎');

        if (activeBoosts.length === 0) {
            return interaction.editReply('✨ No global boosts are currently active.');
        }

        const embed = new EmbedBuilder()
            .setTitle('🚀 Active Global Boosts')
            .setDescription(global.eventMessage ? `**Event:** ${global.eventMessage}\n\n${activeBoosts.join('\n')}` : activeBoosts.join('\n'))
            .setColor('#9b59b6')
            .setTimestamp()
            .setFooter({ text: 'Boosts apply to all players across the server!' });

        return interaction.editReply({ embeds: [embed] });
    }
};