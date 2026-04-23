const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { RELIC_SLOTS, SLOT_CONFIG, SUB_STATS_POOL, getRandomRoll } = require('../utils/relicUtils');
const { MASTER_ITEM_MAP } = require('../data/shopItems');

const ITEMS_PER_PAGE = 5;

/**
 * Exponential XP formula: 1000 * (1.2 ^ Level)
 */
function getRequiredRelicXp(level) {
    if (level >= 15) return 0;
    return Math.floor(1000 * Math.pow(1.2, level));
}

/**
 * Exponential Gold formula: 2000 * (1.3 ^ Level)
 */
function getUpgradeGoldCost(level) {
    return Math.floor(2000 * Math.pow(1.3, level));
}

function formatStatValue(stat, value) {
    const percentStats = ['cr_rate', 'cd_mult', 'energy_regen'];
    if (percentStats.includes(stat) || stat.endsWith('_percent')) {
        return `${(value * 100).toFixed(1)}%`;
    }
    return `+${Math.floor(value)}`;
}

function getRelicPage(user, page = 0) {
    const relics = user.relicInventory;
    const maxPages = Math.ceil(relics.length / ITEMS_PER_PAGE) - 1;
    page = Math.max(0, Math.min(page, maxPages));

    const embed = new EmbedBuilder()
        .setTitle(`🔮 ${user.username}'s Relics`)
        .setColor('#9b59b6');

    if (relics.length === 0) {
        embed.setDescription("*You don't have any relics yet. Conquer a dungeon to find one!*");
        return { embed, row: null };
    }

    const startIndex = page * ITEMS_PER_PAGE;
    const pageRelics = relics.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    let desc = `**Page ${page + 1} / ${maxPages + 1}**\n\n`;
    pageRelics.forEach(relic => {
        const equippedTag = relic.isEquipped ? ' ✅' : '';
        const lockTag = relic.isLocked ? ' 🔒' : '';
        const reqXp = getRequiredRelicXp(relic.level);
        const xpProgress = relic.level < 15 ? ` [XP: ${relic.xp || 0}/${reqXp}]` : ' [MAX]';
        
        desc += `**${relic.name}** (+${relic.level})${equippedTag}${lockTag}${xpProgress}\n`;
        desc += `Slot: \`${relic.slot.toUpperCase()}\` | Set: \`${relic.setId.replace(/_/g, ' ')}\`\n`;
        
        const mainStatName = relic.mainStat.stat.replace('atk_matk', 'ATK & MATK').replace('_percent', '%').toUpperCase();
        desc += `Main: \`${mainStatName}: ${formatStatValue(relic.mainStat.stat, relic.mainStat.value)}\`\n`;
        
        const subs = relic.subStats.map(s => `${s.stat.toUpperCase()}: ${formatStatValue(s.stat, s.value)}`).join(', ');
        desc += `Subs: *${subs}*\n`;
        desc += `ID: \`${relic.instanceId.slice(-6)}\`\n\n`;
    });

    embed.setDescription(desc);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`relic:page:${page - 1}`)
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`relic:page:${page + 1}`)
                .setLabel('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= maxPages),
        );

    return { embed, row };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('relic')
        .setDescription('Manage your mystical relics.')
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription('View your relic inventory.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('equip')
                .setDescription('Equip a relic.')
                .addStringOption(option => option.setName('id').setDescription('Relic Name or ID (last 6 digits)').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('upgrade')
                .setDescription('Upgrade a relic using Essence and Gold.')
                .addStringOption(option => option.setName('id').setDescription('Relic Name or ID (last 6 digits)').setRequired(true).setAutocomplete(true))
                .addStringOption(option => 
                    option.setName('essence')
                        .setDescription('Type of essence to use')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Relic Essence (500 XP)', value: 'relic_essence' },
                            { name: 'Sanctifying Essence (2500 XP)', value: 'sanctifying_essence' }
                        ))
                .addIntegerOption(option => option.setName('amount').setDescription('Quantity to use').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('lock')
                .setDescription('Lock a relic to prevent it from being sold or salvaged.')
                .addStringOption(option => option.setName('id').setDescription('Relic Name or ID (last 6 digits)').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('unlock')
                .setDescription('Unlock a relic.')
                .addStringOption(option => option.setName('id').setDescription('Relic Name or ID (last 6 digits)').setRequired(true).setAutocomplete(true))
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        // Optimize: fetch only relicInventory, use lean
        const user = await User.findOne({ userId: interaction.user.id }).select('relicInventory').lean();
        if (!user || !user.relicInventory) return interaction.respond([]);

        const choices = [];
        user.relicInventory.forEach(relic => {
            const shortId = relic.instanceId.slice(-6);
            const lockTag = relic.isLocked ? ' 🔒' : '';
            if (relic.name.toLowerCase().includes(focusedValue) || shortId.toLowerCase().includes(focusedValue)) {
                choices.push({ name: `${relic.name} (+${relic.level})${lockTag} [${shortId}]`, value: shortId });
            }
        });

        await interaction.respond(choices.slice(0, 25));
    },

    async handleButton(interaction, action, args) {
        if (action !== 'page') return;
        await interaction.deferUpdate();
        const user = await User.findOne({ userId: interaction.user.id });
        const { embed, row } = getRelicPage(user, parseInt(args[0]));
        await interaction.editReply({ embeds: [embed], components: row ? [row] : [] });
    },

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply("Use `/start` first!");

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            const { embed, row } = getRelicPage(user, 0);
            return interaction.editReply({ embeds: [embed], components: row ? [row] : [] });
        }

        if (subcommand === 'equip') {
            const relicId = interaction.options.getString('id').toLowerCase();
            const relic = user.relicInventory.find(r => r.instanceId.endsWith(relicId));
            if (!relic) return interaction.editReply("❌ Relic not found.");
            if (relic.isEquipped) return interaction.editReply("❌ That relic is already equipped!");

            const currentEquippedId = user.relicEquipment.get(relic.slot);
            if (currentEquippedId) {
                const oldRelic = user.relicInventory.find(r => r.instanceId === currentEquippedId);
                if (oldRelic) oldRelic.isEquipped = false;
            }
            relic.isEquipped = true;
            user.relicEquipment.set(relic.slot, relic.instanceId);
            
            user.markModified('relicEquipment');
            user.markModified('relicInventory');
            
            await user.save();
            return interaction.editReply(`✅ Successfully equipped **${relic.name}** to the **${relic.slot.toUpperCase()}** slot!`);
        }

        if (subcommand === 'upgrade') {
            const relicId = interaction.options.getString('id').toLowerCase();
            const essenceType = interaction.options.getString('essence');
            const amount = interaction.options.getInteger('amount') || 1;

            const relic = user.relicInventory.find(r => r.instanceId.endsWith(relicId));
            if (!relic) return interaction.editReply("❌ Relic not found.");
            if (relic.level >= 15) return interaction.editReply("❌ This relic is already at max level (+15)!");

            const userEssence = user.inventory.get(essenceType) || 0;
            if (userEssence < amount) return interaction.editReply(`❌ You only have **${userEssence}x** of that essence.`);

            const xpPerEssence = essenceType === 'relic_essence' ? 500 : 2500;
            
            // Exponential Gold Cost logic:
            // Calculate total cost for 'amount' of essence based on CURRENT level
            const goldPerXp = getUpgradeGoldCost(relic.level) / 1000; 
            const totalGoldCost = Math.floor(goldPerXp * xpPerEssence * amount);

            if (user.gold < totalGoldCost) {
                return interaction.editReply(`❌ You need **${totalGoldCost} Gold** to use these essences at your relic's current level (+${relic.level}).`);
            }

            // Process Upgrade
            user.gold -= totalGoldCost;
            user.removeItem(essenceType, amount);
            
            let totalXpGain = xpPerEssence * amount;
            relic.xp = (relic.xp || 0) + totalXpGain;

            let levelsGained = 0;
            let subMsgs = [];

            while (relic.level < 15) {
                const reqXp = getRequiredRelicXp(relic.level);
                if (relic.xp >= reqXp) {
                    relic.xp -= reqXp;
                    relic.level += 1;
                    levelsGained++;

                    // 1. Boost Main Stat
                    const config = SLOT_CONFIG[relic.slot];
                    if (config) {
                        if (config.increment) relic.mainStat.value += config.increment;
                        else if (config.pool) {
                            const poolEntry = config.pool.find(p => p.stat === relic.mainStat.stat);
                            if (poolEntry) relic.mainStat.value += poolEntry.increment;
                        }
                    }

                    // 2. Roll/Boost Sub-stat every 3 levels
                    if (relic.level % 3 === 0) {
                        if (relic.subStats.length < 4) {
                            const usedSubs = new Set(relic.subStats.map(s => s.stat));
                            usedSubs.add(relic.mainStat.stat);
                            if (relic.mainStat.stat === 'atk_matk') { usedSubs.add('atk'); usedSubs.add('matk'); }

                            const availablePool = SUB_STATS_POOL.filter(s => !usedSubs.has(s));
                            const newStat = availablePool[Math.floor(Math.random() * availablePool.length)];
                            const val = getRandomRoll(newStat);
                            relic.subStats.push({ stat: newStat, value: val });
                            subMsgs.push(`🆕 New sub-stat: **${newStat.toUpperCase()}** (+${formatStatValue(newStat, val)})`);
                        } else {
                            const randomSub = relic.subStats[Math.floor(Math.random() * relic.subStats.length)];
                            const gain = getRandomRoll(randomSub.stat);
                            randomSub.value = parseFloat((randomSub.value + gain).toFixed(3));
                            subMsgs.push(`✨ Boosted: **${randomSub.stat.toUpperCase()}** (+${formatStatValue(randomSub.stat, gain)})`);
                        }
                    }
                } else {
                    break;
                }
            }

            if (relic.level >= 15) relic.xp = 0;

            user.markModified('relicInventory');
            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('✨ Relic Enhanced')
                .setDescription(`Used **${amount}x ${essenceType.replace('_', ' ').toUpperCase()}**.\nXP Gained: **+${totalXpGain}**`)
                .addFields(
                    { name: 'Level', value: `+${relic.level - levelsGained} ➔ **+${relic.level}**`, inline: true },
                    { name: 'Gold Spent', value: `💰 ${totalGoldCost}`, inline: true }
                )
                .setColor('#f1c40f');

            if (subMsgs.length > 0) {
                embed.addFields({ name: 'Sub-stat Changes', value: subMsgs.join('\n') });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'lock') {
            const relicId = interaction.options.getString('id').toLowerCase();
            const relic = user.relicInventory.find(r => r.instanceId.endsWith(relicId));
            if (!relic) return interaction.editReply("❌ Relic not found.");
            
            relic.isLocked = true;
            await user.save();
            return interaction.editReply(`🔒 **${relic.name}** is now locked and cannot be salvaged or traded.`);
        }

        if (subcommand === 'unlock') {
            const relicId = interaction.options.getString('id').toLowerCase();
            const relic = user.relicInventory.find(r => r.instanceId.endsWith(relicId));
            if (!relic) return interaction.editReply("❌ Relic not found.");
            
            relic.isLocked = false;
            await user.save();
            return interaction.editReply(`🔓 **${relic.name}** is now unlocked.`);
        }
    }
};