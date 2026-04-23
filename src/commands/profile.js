const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const { getNextLevelExp, getNextClassLevelExp } = require('../systems/xp'); 
const { getRelicSetCounts, getSetBonusDescription, RELIC_SETS } = require('../utils/relicUtils');
const { calculateEffectiveStats } = require('../systems/stats');
const { advanceTutorial } = require('../utils/checks');

function createProgressBar(current, max, length = 10) {
    const percent = Math.min(Math.max(current / max, 0), 1);
    const filled = Math.round(length * percent);
    const empty = length - filled;
    return '`' + '█'.repeat(filled) + '░'.repeat(empty) + '`';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your character stats and progress')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Select the user whose profile you want to view.')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }); 

        const targetUser = interaction.options.getUser('target') || interaction.user;
        const user = await User.findOne({ userId: targetUser.id });

        if (!user) {
            const msg = targetUser.id === interaction.user.id 
                ? 'You have not started your journey yet! Use `/start`.' 
                : `${targetUser.username} has not started their journey yet.`;
            return interaction.editReply({ content: msg });
        }

        // 🕒 Process Regeneration
        const s = calculateEffectiveStats(user);
        if (user.processRegen(s)) {
            await user.save();
        }

        // 📖 Tutorial Progress: Step 1 (Index 0 in TUTORIAL_STEPS)
        let tutorialEmbed = null;
        if (targetUser.id === interaction.user.id) {
            tutorialEmbed = await advanceTutorial(user, 0, interaction, '10 Gold', (u) => { u.gold += 10; });
        }

        // --- CALCULATIONS ---
        const nextLevelExp = getNextLevelExp(user.level); 
        const playerBar = createProgressBar(user.exp, nextLevelExp, 8);
        
        const classLevel = user.classLevel || 1;
        const nextClassExp = getNextClassLevelExp(classLevel);
        const isMaxClass = classLevel >= 20;
        const classBar = isMaxClass ? '`MAXED OUT`' : createProgressBar(user.classExp || 0, nextClassExp, 8);
        const classExpText = isMaxClass ? 'Max Level' : `${user.classExp || 0}/${nextClassExp} XP`;

        // --- STYLING ---
        let color = '#99AAB5'; 
        let classEmoji = '⚔️';
        if (user.class === 'warrior') { color = '#E74C3C'; classEmoji = '🛡️'; }
        if (user.class === 'mage') { color = '#3498DB'; classEmoji = '🔮'; }
        if (user.class === 'rogue') { color = '#2ECC71'; classEmoji = '🗡️'; }

        // --- EQUIPMENT ---
        const slots = [
            { key: 'weapon', label: 'Weapon', emoji: '⚔️' },
            { key: 'head', label: 'Head', emoji: '🧢' },
            { key: 'chest', label: 'Chest', emoji: '👕' },
            { key: 'legs', label: 'Legs', emoji: '👖' },
            { key: 'feet', label: 'Feet', emoji: '👢' }
        ];

        let equipList = [];
        slots.forEach(slot => {
            const itemId = user.equipment.get(slot.key);
            if (itemId) {
                const item = MASTER_ITEM_MAP[itemId];
                const name = item ? item.name : itemId.replace(/_/g, ' ');
                const stars = item && item.stars ? '⭐'.repeat(item.stars) : '';
                equipList.push(`${slot.emoji} **${name}** ${stars}`);
            } else {
                equipList.push(`${slot.emoji} *Empty*`);
            }
        });
        
        // --- RELICS ---
        const relicSlots = [
            { key: 'necklace', label: 'Necklace', emoji: '📿' },
            { key: 'ring', label: 'Ring', emoji: '💍' },
            { key: 'earring', label: 'Earring', emoji: '👂' },
            { key: 'brooch', label: 'Brooch', emoji: '🏵️' },
            { key: 'amulet', label: 'Amulet', emoji: '🧿' }
        ];

        let relicList = [];
        relicSlots.forEach(slot => {
            const instanceId = user.relicEquipment.get(slot.key);
            if (instanceId) {
                const relic = user.relicInventory.find(r => r.instanceId === instanceId);
                if (relic) {
                    relicList.push(`${slot.emoji} **${relic.name}** (+${relic.level})`);
                } else {
                    relicList.push(`${slot.emoji} *Unknown*`);
                }
            } else {
                relicList.push(`${slot.emoji} *Empty*`);
            }
        });

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

        // --- EMBED ---
        const embed = new EmbedBuilder()
            .setTitle(`${classEmoji} ${user.username}'s Profile`)
            .setDescription(`**Class:** ${user.class.charAt(0).toUpperCase() + user.class.slice(1)}`)
            .setColor(color)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                // Row 1: Player Progress
                { 
                    name: `📊 Level ${user.level}`, 
                    value: `${playerBar}\n*${user.exp}/${nextLevelExp} XP*`, 
                    inline: true 
                },
                // Row 1: Class Progress
                { 
                    name: `🎓 Class Lv ${classLevel}`, 
                    value: `${classBar}\n*${classExpText}*`, 
                    inline: true 
                },
                // Row 1: Economy
                { 
                    name: '💰 Wealth', 
                    value: `**${user.gold}** Gold\n**${user.unspentPoints}** SP Avail.`, 
                    inline: true 
                },
                
                // Row 2: Location
                { name: '📍 Location', value: `*${user.region}*`, inline: false },

                // Row 3: Equipment & Relics
                { name: '🛡️ Armor & Weapon', value: equipList.join('\n'), inline: true },
                { name: '🔮 Relics', value: relicList.join('\n'), inline: true },
                
                // Row 4: Set Bonuses
                { name: '✨ Set Bonuses', value: setBonusStr, inline: false }
            )
            .setFooter({ 
                text: `Joined: ${user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'}` 
            });

        const embeds = [embed];
        if (tutorialEmbed) embeds.push(...tutorialEmbed); // Tutorial reward below main message

        await interaction.editReply({ embeds });
    },
};