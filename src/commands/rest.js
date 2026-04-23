const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');
const { calculateEffectiveStats } = require('../systems/stats');

/**
 * Calculates rest cost based on level: 50 * (1.15 ^ (level - 1))
 */
function getRestCost(level) {
    return Math.floor(50 * Math.pow(1.15, (level || 1) - 1));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rest')
        .setDescription('Recover your vitals at an Inn or a Shrine.'),

    async handleButton(interaction, action, args) {
        if (action !== 'confirm' && action !== 'cancel' && action !== 'shrine_confirm') return;

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        if (action === 'cancel') {
            return interaction.update({ content: 'You decided not to rest.', embeds: [], components: [] });
        }

        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const place = subRegion.places ? subRegion.places.find(p => p.id === user.currentPlace) : null;

        if (!place || (!place.features.includes('inn') && !place.features.includes('rest'))) {
            return interaction.update({ content: '❌ You are no longer at a resting place!', embeds: [], components: [] });
        }

        const maxStats = calculateEffectiveStats(user);
        const isFull = user.stats.hp >= maxStats.maxHp && user.stats.mana >= maxStats.maxMana && user.stats.stamina >= maxStats.maxStamina;

        if (isFull) {
            return interaction.update({ content: '❌ You feel completely energized! There is no need to rest right now.', embeds: [], components: [] });
        }

        if (action === 'shrine_confirm') {
            if ((user.fatigue || 0) < 3) {
                return interaction.update({ content: '❌ You aren\'t tired enough to rest at the shrine yet. Perform more actions first!', embeds: [], components: [] });
            }

            user.stats.hp = Math.min(maxStats.maxHp, Math.floor(user.stats.hp + (maxStats.maxHp * 0.2)));
            user.stats.mana = Math.min(maxStats.maxMana, Math.floor(user.stats.mana + (maxStats.maxMana * 0.2)));
            user.stats.stamina = Math.min(maxStats.maxStamina, Math.floor(user.stats.stamina + (maxStats.maxStamina * 0.2)));
            user.fatigue = 0;
            await user.save();

            const shrineEmbed = new EmbedBuilder()
                .setTitle(`✨ Rested at ${place.name}`)
                .setDescription(`The tranquil aura of the shrine soothes your spirit. You feel a portion of your strength returning.\n\n✨ **Recovery:** +20% HP/Mana/Stamina\n💪 **Fatigue:** Reset to 0`)
                .setColor('#3498db')
                .setFooter({ text: 'A moment of peace in a chaotic world.' });

            return interaction.update({ embeds: [shrineEmbed], components: [] });
        }

        // Inn Rest
        if ((user.fatigue || 0) < 1) {
            return interaction.update({ content: '❌ You aren\'t tired enough to sleep at an Inn yet! Go out and do something first.', embeds: [], components: [] });
        }

        const currentCost = getRestCost(user.level);
        if (user.gold < currentCost) {
            return interaction.update({ content: '❌ You don\'t have enough gold!', embeds: [], components: [] });
        }

        // --- RANDOM EVENT LOGIC ---
        const roll = Math.random();
        let event = {
            title: '💤 Well Rested',
            desc: 'You sleep soundly through the night.',
            healMult: 1.0,
            goldLoss: 0,
            buffs: [],
            color: '#2ecc71'
        };

        if (roll < 0.01) { 
            event = {
                title: '😱 Eldritch Nightmares',
                desc: 'Horrors beyond comprehension haunted your dreams. You wake up feeling weak and drained.',
                healMult: 0.1,
                color: '#000000',
                isNightmare: true
            };
        } else if (roll < 0.06) {
            event = {
                title: '🦟 Bed Bugs!',
                desc: 'The room was infested! You spent the night scratching instead of sleeping.',
                healMult: 0.2,
                buffs: [{ id: 'rest_itch', name: 'Itchy', stat: 'spd', value: -2, durationBattles: 3, type: 'flat' }],
                color: '#e67e22'
            };
        } else if (roll < 0.11) {
            const stolen = Math.floor(user.gold * 0.03) + 10;
            event = {
                title: '💸 Pickpocketed!',
                desc: 'Someone snuck into your room! You rested well, but your purse feels lighter.',
                healMult: 1.0,
                goldLoss: stolen,
                color: '#e74c3c'
            };
        } else if (roll < 0.21) {
            event = {
                title: '🍻 Noisy Neighbors',
                desc: 'The tavern downstairs was rowdy all night. You barely got any sleep.',
                healMult: 0.6,
                color: '#f1c40f'
            };
        } else if (roll > 0.95) {
            event = {
                title: '🧘 Deep Meditation',
                desc: 'The silence of the room allowed for perfect recovery. You feel stronger than ever!',
                healMult: 1.0,
                buffs: [{ id: 'rest_focus', name: 'Focused', stat: 'cr_rate', value: 0.05, durationBattles: 5, type: 'flat' }],
                color: '#3498db'
            };
        }

        user.gold -= currentCost;
        if (event.goldLoss > 0) user.gold = Math.max(0, user.gold - event.goldLoss);

        user.stats.hp = Math.max(user.stats.hp, Math.floor(maxStats.maxHp * event.healMult));
        user.stats.mana = Math.max(user.stats.mana, Math.floor(maxStats.maxMana * event.healMult));
        user.stats.stamina = Math.max(user.stats.stamina, Math.floor(maxStats.maxStamina * event.healMult));
        user.fatigue = 0;

        if (event.isNightmare) {
            const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const stats = ['atk', 'def', 'matk', 'mdef', 'hp', 'spd'];
            stats.forEach(s => {
                user.buffs.push({
                    id: `nightmare_${s}`,
                    name: 'Nightmare Curse',
                    stat: s,
                    value: -0.10,
                    type: 'percent',
                    expiresAt: expiry,
                    durationBattles: 0
                });
            });
        }

        if (event.buffs && event.buffs.length > 0) {
            event.buffs.forEach(b => user.buffs.push(b));
        }
        
        await user.save();

        const successEmbed = new EmbedBuilder()
            .setTitle(event.title)
            .setDescription(`${event.desc}\n\n❤️ **HP:** ${user.stats.hp} / ${maxStats.maxHp}\n💧 **Mana:** ${user.stats.mana} / ${maxStats.maxMana}\n💪 **Stamina:** ${user.stats.stamina} / ${maxStats.maxStamina}`)
            .setColor(event.color)
            .setFooter({ text: `Paid ${currentCost}g ${event.goldLoss > 0 ? `(+${event.goldLoss}g stolen)` : ''} • Stayed at ${place.name} Inn` });

        if (event.isNightmare) {
            successEmbed.addFields({ name: '💀 Cursed', value: '**Nightmare Curse**: -10% All Stats (Expires in 24h)' });
        } else if (event.buffs && event.buffs.length > 0) {
            event.buffs.forEach(b => {
                const sign = b.value >= 0 ? '+' : '';
                const valStr = b.type === 'percent' ? `${(b.value * 100).toFixed(0)}%` : b.value;
                successEmbed.addFields({ name: '✨ Status Effect', value: `**${b.name}**: ${sign}${valStr} ${b.stat.toUpperCase()} (${b.durationBattles || '24h'} duration)` });
            });
        }

        return interaction.update({ embeds: [successEmbed], components: [] });
    },

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        } catch (e) {
            console.error('Failed to defer rest reply:', e);
            return;
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const place = subRegion.places ? subRegion.places.find(p => p.id === user.currentPlace) : null;

        if (!place || (!place.features.includes('inn') && !place.features.includes('rest'))) {
            return interaction.editReply('❌ There is no Inn or Shrine here! You must be in a settlement or landmark to rest.');
        }

        const maxStats = calculateEffectiveStats(user);
        const isFull = user.stats.hp >= maxStats.maxHp && user.stats.mana >= maxStats.maxMana && user.stats.stamina >= maxStats.maxStamina;

        if (isFull) {
            return interaction.editReply('❌ You feel completely energized! There is no need to rest right now.');
        }

        const isShrine = place.features.includes('rest') && !place.features.includes('inn');

        if (isShrine) {
            const embed = new EmbedBuilder()
                .setTitle(`✨ ${place.name}`)
                .setDescription(
                    `You find a quiet spot near the shrine to catch your breath.\n\n` +
                    `**Resting at Shrine:**\n` +
                    `✨ **Effect:** Restore **20%** of all Vitals\n` +
                    `💰 **Cost:** Free\n` +
                    `💪 **Fatigue Requirement:** 3+ Actions\n\n` +
                    `*Your current fatigue: **${user.fatigue || 0}/3***`
                )
                .setColor('#3498db');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rest:shrine_confirm')
                        .setLabel('Rest Here')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled((user.fatigue || 0) < 3),
                    new ButtonBuilder()
                        .setCustomId('rest:cancel')
                        .setLabel('Leave')
                        .setStyle(ButtonStyle.Secondary)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        // Inn Rest UI
        const cost = getRestCost(user.level);
        const embed = new EmbedBuilder()
            .setTitle(`🏨 ${place.name} Inn`)
            .setDescription(
                `The warmth of the hearth and the smell of fresh bread welcome you. A room for the night will cost you **${cost.toLocaleString()} gold**.\n\n` +
                `*Your current fatigue: **${user.fatigue || 0}/1***`
            )
            .addFields({ name: '💰 Your Gold', value: `**${user.gold.toLocaleString()}g**`, inline: true })
            .setColor('#3498db');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rest:confirm')
                    .setLabel(`Rest (${cost}g)`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(user.gold < cost || (user.fatigue || 0) < 1),
                new ButtonBuilder()
                    .setCustomId('rest:cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};