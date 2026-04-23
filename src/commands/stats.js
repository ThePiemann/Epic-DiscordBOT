const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { calculateEffectiveStats } = require('../systems/stats');
const { getRelicSetCounts, getSetBonusDescription, RELIC_SETS } = require('../utils/relicUtils');
const { advanceTutorial } = require('../utils/checks');

function createBar(current, max, length = 8, color = '█') {
    if (max === 0) return '`' + '░'.repeat(length) + '`';
    const percent = Math.min(Math.max(current / max, 0), 1);
    const filled = Math.round(length * percent);
    const empty = length - filled;
    return '`' + color.repeat(filled) + '░'.repeat(empty) + '`';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your detailed combat stats and allocated points'),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
            return interaction.editReply({ content: 'Use `/start` to create a character first!' });
        }
        
        // Calculate the user's current effective stats
        const s = calculateEffectiveStats(user);
        
        // 🕒 Process Regeneration
        if (user.processRegen(s)) {
            await user.save();
        }

        // 📖 Tutorial Progress: Step 2 (Index 1 in TUTORIAL_STEPS)
        const tutorialEmbed = await advanceTutorial(user, 1, interaction, '1 Small Potion', (u) => { u.addItem('small_potion', 1); });
        
        // Determine Color based on class
        let color = '#99AAB5'; 
        if (user.class === 'warrior') color = '#E74C3C';
        if (user.class === 'mage') color = '#3498DB'; 
        if (user.class === 'rogue') color = '#2ECC71';

        // --- SET BONUSES ---
        const setCounts = getRelicSetCounts(user);
        let setBonusStr = '';
        for (const [setId, count] of Object.entries(setCounts)) {
            if (count >= 2) {
                const set = RELIC_SETS.find(s => s.id === setId);
                const bonuses = getSetBonusDescription(setId, count);
                setBonusStr += `**${set.name}** (${count}/4)\n` + bonuses.join('\n') + '\n';
            }
        }
        if (!setBonusStr) setBonusStr = '*No active set bonuses.*';

        // --- ACTIVE BUFFS ---
        let buffStr = '';
        if (user.buffs && user.buffs.length > 0) {
            user.buffs.forEach(b => {
                let dur = '';
                if (b.durationBattles > 0) dur = ` (${b.durationBattles} Battles)`;
                else if (b.expiresAt) {
                    const mins = Math.ceil((b.expiresAt - Date.now()) / 60000);
                    dur = ` (${mins}m left)`;
                }
                buffStr += `✨ **${b.name}**: +${b.type === 'percent' ? (b.value * 100).toFixed(0) + '%' : b.value} ${b.stat.toUpperCase()}${dur}\n`;
            });
        }
        if (!buffStr) buffStr = '*No active buffs.*';

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${user.username}'s Statistics`)
            .setDescription(`**Lv.** ${user.level} ${user.class.charAt(0).toUpperCase() + user.class.slice(1)} | **Unspent SP:** ${user.unspentPoints}`)
            .setColor(color)
            .addFields(
                // --- VITALITY ---
                { 
                    name: '❤️ Vitality', 
                    value: `**HP:** ${Math.floor(s.hp)} / ${s.maxHp}\n${createBar(s.hp, s.maxHp, 10, '🟥')}\n` +
                           `**Mana:** ${Math.floor(s.mana)} / ${s.maxMana}\n${createBar(s.mana, s.maxMana, 10, '🟦')}\n` + 
                           `**Stamina:** ${Math.floor(s.stamina)} / ${s.maxStamina}\n${createBar(s.stamina, s.maxStamina, 10, '🟨')}`,
                    inline: true 
                },
                // --- ATTRIBUTES ---
                {
                    name: '💪 Attributes',
                    value: `**STR:** ${user.allocatedStats.str || 0} \n` +
                           `**INT:** ${user.allocatedStats.int || 0} \n` +
                           `**DEX:** ${user.allocatedStats.dex || 0} \n` +
                           `**CON:** ${user.allocatedStats.con || 0} `,
                    inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true }, // Spacer for 3-col layout

                // --- COMBAT STATS ---
                {
                    name: '⚔️ Combat',
                    value: `**Atk:** ${Math.floor(s.atk)}  **M.Atk:** ${Math.floor(s.matk)}\n` +
                           `**Def:** ${Math.floor(s.def)}  **M.Def:** ${Math.floor(s.mdef)}\n` +
                           `**Spd:** ${Math.floor(s.spd)}`,
                    inline: true
                },
                // --- CRITS & REGEN ---
                {
                    name: '⚡ Advanced',
                    value: `**Crit Rate:** ${(s.cr_rate * 100).toFixed(1)}%\n` +
                           `**Crit Dmg:** ${(s.cd_mult * 100).toFixed(0)}%\n` +
                           `**Energy Regen:** ${s.energy_regen}%`,
                    inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true },

                // --- BUFFS & SETS ---
                { name: '✨ Active Buffs', value: buffStr, inline: true },
                { name: '✨ Active Set Bonuses', value: setBonusStr, inline: true }
            );

        const embeds = [embed];
        if (tutorialEmbed) embeds.push(...tutorialEmbed);

        await interaction.editReply({ embeds });
    }
};