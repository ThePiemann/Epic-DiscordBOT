const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const os = require('os');
const User = require('../models/User');
const mongoose = require('mongoose'); 
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const REGIONS = require('../data/regions');
const CLASSES = require('../data/classes');
const { addExperience } = require('../systems/leveling');
const { calculateEffectiveStats } = require('../systems/stats');
const LevelUpVisuals = require('../utils/LevelUpVisuals');
require('dotenv').config(); 

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getItemName(itemId) {
    const item = MASTER_ITEM_MAP[itemId];
    return item ? item.name : itemId;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin tools for modifying player data.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addSubcommand(subcommand => 
            subcommand.setName('debug_me').setDescription('View detailed system environment and bot metrics.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('database').setDescription('View MongoDB connection and storage statistics.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('dumpdata').setDescription('Exports a raw JSON dump of player data.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('resetstats').setDescription('Resets allocated stats and refunds points.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('takeitem').setDescription('Remove item from inventory.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('giveitem').setDescription('Give item to inventory.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('givegold').setDescription('Inject gold into user account.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('setlevel').setDescription('Set PLAYER level directly.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('addexp').setDescription('Give PLAYER EXP.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('set_gold').setDescription('Set absolute gold total.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('check_inv').setDescription('View raw inventory contents.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('check_cooldown').setDescription('View active cooldown timers.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('wipe').setDescription('⚠️ Permanently wipe user data.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('heal').setDescription('Fully restore HP, Mana, and Stamina.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('setclass').setDescription('Force change user class.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addStringOption(o => o.setName('class_id').setDescription('Class ID (e.g. warrior, knight)').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('setclasslevel').setDescription('Set CLASS level directly.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('addclassexp').setDescription('Give CLASS EXP.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('teleport').setDescription('Move player to a specific region.').addUserOption(o => o.setName('target').setDescription('Target').setRequired(true)).addStringOption(o => o.setName('region_id').setDescription('Region ID (e.g. verdant_expanse)').setRequired(true)).addStringOption(o => o.setName('subregion_id').setDescription('Sub-Region ID (Optional)').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('mail_item').setDescription('Send item to player mailbox.').addUserOption(o => o.setName('target').setDescription('Recipient').setRequired(true)).addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Message content').setRequired(true)).addStringOption(o => o.setName('sender_type').setDescription('Who is the sender?').setRequired(false).addChoices({ name: 'Anonymous', value: 'Anonymous' }, { name: 'System', value: 'System Admin' })).addStringOption(o => o.setName('alert').setDescription('Send a DM notification?').setRequired(false).addChoices({ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' }))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('mail_gold').setDescription('Send gold to player mailbox.').addUserOption(o => o.setName('target').setDescription('Recipient').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Message content').setRequired(true)).addStringOption(o => o.setName('sender_type').setDescription('Who is the sender?').setRequired(false).addChoices({ name: 'Anonymous', value: 'Anonymous' }, { name: 'System', value: 'System Admin' })).addStringOption(o => o.setName('alert').setDescription('Send a DM notification?').setRequired(false).addChoices({ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' }))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('force_exit_combat').setDescription('Forces a user out of the combat state.').addUserOption(o => o.setName('target').setDescription('Target player').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('sim_levelup').setDescription('Simulate a level up visual for testing.').addUserOption(o => o.setName('target').setDescription('Target player').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('force_start').setDescription('Force initialize a player character.').addUserOption(o => o.setName('target').setDescription('Target player').setRequired(true)).addStringOption(o => o.setName('class_id').setDescription('Initial Class ID').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('economy').setDescription('View global economy statistics.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('boost').setDescription('Manage global server-wide boosts.').addStringOption(o => o.setName('type').setDescription('Boost Type').setRequired(true).addChoices({ name: 'XP', value: 'xp' }, { name: 'Gathering', value: 'gathering' }, { name: 'Gold', value: 'gold' }, { name: 'Drop Rate', value: 'dropRate' })).addNumberOption(o => o.setName('multiplier').setDescription('Multiplier (e.g. 2.0 for 2x)').setRequired(true)).addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes (Optional)').setRequired(false)).addStringOption(o => o.setName('message').setDescription('Event Message (Optional)').setRequired(false))
        ),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const focusedValue = focusedOption.value.toLowerCase();

        if (focusedOption.name === 'class_id') {
            const choices = Object.values(CLASSES)
                .filter(c => c.tier === 1)
                .map(c => ({ name: c.name, value: c.id }))
                .filter(c => c.name.toLowerCase().includes(focusedValue) || c.value.toLowerCase().includes(focusedValue));
            
            return interaction.respond(choices.slice(0, 25));
        }
    },

    async execute(interaction) {
        const adminId = process.env.ADMIN_USER_ID;
        if (interaction.user.id !== adminId) {
             const errorEmbed = new EmbedBuilder()
                .setTitle('🛑 Access Denied')
                .setDescription('You are not authorized to use this command.')
                .setColor('#e74c3c'); 
             return interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
        }
        
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'economy') {
            const players = await User.find({}).select('gold inventory uniqueInventory').lean();
            const Auction = require('../models/Auction');
            const auctions = await Auction.find({}).lean();

            let totalGold = 0;
            let totalItems = 0;
            let estimatedItemValue = 0;
            let auctionValue = 0;
            
            const goldHolders = [];
            const rarityDistribution = {
                'common': 0, 'uncommon': 0, 'rare': 0, 'epic': 0, 'legendary': 0, 'mythic': 0
            };

            players.forEach(p => {
                const pGold = p.gold || 0;
                totalGold += pGold;
                goldHolders.push(pGold);
                
                // Standard Inventory
                if (p.inventory) {
                    const entries = p.inventory instanceof Map ? p.inventory.entries() : Object.entries(p.inventory);
                    for (const [id, qty] of entries) {
                        totalItems += qty;
                        const itemData = MASTER_ITEM_MAP[id];
                        if (itemData) {
                            if (itemData.price) estimatedItemValue += (itemData.price * qty);
                            const r = itemData.rarity?.toLowerCase() || 'common';
                            if (rarityDistribution[r] !== undefined) rarityDistribution[r] += qty;
                        }
                    }
                }

                // Unique Inventory
                if (p.uniqueInventory) {
                    totalItems += p.uniqueInventory.length;
                    p.uniqueInventory.forEach(ui => {
                        const itemData = MASTER_ITEM_MAP[ui.itemId];
                        if (itemData) {
                            if (itemData.price) estimatedItemValue += itemData.price;
                            const r = ui.rarity?.toLowerCase() || itemData.rarity?.toLowerCase() || 'common';
                            if (rarityDistribution[r] !== undefined) rarityDistribution[r]++;
                        }
                    });
                }
            });

            auctions.forEach(a => {
                auctionValue += a.price;
            });

            goldHolders.sort((a, b) => b - a);
            const medianGold = goldHolders.length > 0 ? goldHolders[Math.floor(goldHolders.length / 2)] : 0;
            const top5Gold = goldHolders.slice(0, 5).reduce((a, b) => a + b, 0);

            const econEmbed = new EmbedBuilder()
                .setTitle('⚖️ Global Economy Detailed Overview')
                .setColor('#f1c40f')
                .addFields(
                    { 
                        name: '💰 Currency & Wealth', 
                        value: `Total Gold: **${totalGold.toLocaleString()}g**\nMedian Gold: **${medianGold.toLocaleString()}g**\nTop 5 Holders: **${top5Gold.toLocaleString()}g** (${((top5Gold / totalGold) * 100).toFixed(1)}%)`,
                        inline: false 
                    },
                    { 
                        name: '📦 Inventory Value', 
                        value: `Total Items: **${totalItems.toLocaleString()}**\nEst. Item Value: **${estimatedItemValue.toLocaleString()}g**\nAH Listed Value: **${auctionValue.toLocaleString()}g**`,
                        inline: false 
                    },
                    {
                        name: '💎 Rarity Distribution',
                        value: `Common: \`${rarityDistribution.common}\` | Uncommon: \`${rarityDistribution.uncommon}\` | Rare: \`${rarityDistribution.rare}\`\nEpic: \`${rarityDistribution.epic}\` | Legendary: \`${rarityDistribution.legendary}\` | Mythic: \`${rarityDistribution.mythic}\``,
                        inline: false
                    },
                    { 
                        name: '📈 Market Health', 
                        value: `Avg Net Worth: **${Math.floor((totalGold + estimatedItemValue + auctionValue) / players.length).toLocaleString()}g**\nActive Auctions: **${auctions.length}**`,
                        inline: true 
                    },
                    {
                        name: '👥 Player Base',
                        value: `Total Initialized: **${players.length}**`,
                        inline: true
                    }
                )
                .setFooter({ text: 'Net worth includes liquid gold + estimated inventory value + AH listings.' })
                .setTimestamp();

            return interaction.editReply({ embeds: [econEmbed] });
        }

        if (subcommand === 'boost') {
            const type = interaction.options.getString('type');
            const multiplier = interaction.options.getNumber('multiplier');
            const duration = interaction.options.getInteger('duration');
            const message = interaction.options.getString('message');

            const GlobalState = require('../models/GlobalState');
            let global = await GlobalState.findOne({ key: 'main' });
            if (!global) global = new GlobalState({ key: 'main' });

            global.boosts[type] = multiplier;
            if (duration) {
                global.boosts[`${type}_expires`] = new Date(Date.now() + duration * 60000);
            } else {
                global.boosts[`${type}_expires`] = null; // Permanent until changed
            }

            if (message !== null) global.eventMessage = message;
            global.updatedAt = new Date();
            await global.save();

            let expiryText = duration ? `expires <t:${Math.floor(global.boosts[`${type}_expires`].getTime() / 1000)}:R>` : 'Permanent';

            const boostEmbed = new EmbedBuilder()
                .setTitle('🚀 Global Boost Updated')
                .setDescription(`Set **${type.toUpperCase()}** boost to **${multiplier}x** (${expiryText})!`)
                .setColor('#9b59b6')
                .addFields(
                    { name: 'Current Multipliers', value: `XP: **${global.boosts.xp}x**\nGathering: **${global.boosts.gathering}x**\nGold: **${global.boosts.gold}x**\nDrop Rate: **${global.boosts.dropRate}x**` }
                );
            
            if (global.eventMessage) boostEmbed.setFooter({ text: `Message: ${global.eventMessage}` });

            return interaction.editReply({ embeds: [boostEmbed] });
        }

        if (subcommand === 'force_start') {
            const targetUser = interaction.options.getUser('target');
            const classId = interaction.options.getString('class_id').toLowerCase();
            const classData = CLASSES[classId];

            if (!classData || classData.tier !== 1) {
                return interaction.editReply(`❌ Invalid starting class: \`${classId}\`.`);
            }

            let player = await User.findOne({ userId: targetUser.id });
            if (player) {
                return interaction.editReply(`❌ **${targetUser.username}** already has a character! Use \`/admin wipe\` first if you want to restart them.`);
            }

            player = new User({
                userId: targetUser.id,
                username: targetUser.username,
                class: classId,
                gold: 100,
                level: 1,
                exp: 0,
                tutorialStep: 0,
                region: 'verdant_expanse',
                subRegion: 'gentle_meads'
            });

            // Starter weapon logic
            let starterWeapon = 'starter_sword';
            if (classId === 'mage') starterWeapon = 'starter_staff';
            else if (classId === 'rogue') starterWeapon = 'rusty_dagger';
            
            player.equipment.set('weapon', starterWeapon);

            const effective = calculateEffectiveStats(player);
            player.stats.maxHp = effective.maxHp;
            player.stats.hp = effective.maxHp;
            player.stats.maxMana = effective.maxMana;
            player.stats.mana = effective.maxMana;
            player.stats.maxStamina = effective.maxStamina;
            player.stats.stamina = effective.maxStamina;
            player.stats.atk = effective.atk;
            player.stats.def = effective.def;
            player.stats.matk = effective.matk;
            player.stats.mdef = effective.mdef;
            player.stats.spd = effective.spd;

            await player.save();

            const startEmbed = new EmbedBuilder()
                .setTitle('⚔️ Force Initialization Complete')
                .setDescription(`Successfully created a **${classData.name}** character for **${targetUser.username}**.`)
                .addFields(
                    { name: 'Class', value: classData.name, inline: true },
                    { name: 'Starter Weapon', value: getItemName(starterWeapon), inline: true },
                    { name: 'HP', value: `${player.stats.maxHp}`, inline: true }
                )
                .setColor('#2ecc71');

            return interaction.editReply({ embeds: [startEmbed] });
        }

        // --- SUBCOMMANDS WITHOUT TARGET ---
        if (subcommand === 'debug_me') {
            const uptime = Math.floor(process.uptime());
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            
            const dbState = {
                0: 'Disconnected',
                1: 'Connected',
                2: 'Connecting',
                3: 'Disconnecting',
                99: 'Uninitialized',
            };

            const mem = process.memoryUsage();
            const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            
            const debugEmbed = new EmbedBuilder()
                .setTitle('⚙️ System & Core Debugger')
                .setColor('#2ecc71')
                .setTimestamp()
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    { 
                        name: '🖥️ System Environment', 
                        value: `\`\`\`yaml\nOS:       ${os.platform()} (${os.arch()})\nRelease:  ${os.release()}\nCPU:      ${os.cpus()[0].model.trim()}\nCores:    ${os.cpus().length}\nMemory:   ${(totalMem - freeMem).toFixed(2)}GB / ${totalMem}GB\`\`\``, 
                        inline: false 
                    },
                    { 
                        name: '🤖 Bot Instance', 
                        value: `\`\`\`yaml\nNode:     ${process.version}\nHeap:     ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(2)}MB\nPing:     ${interaction.client.ws.ping}ms\nUptime:   ${days}d ${hours}h ${minutes}m ${seconds}s\`\`\``, 
                        inline: false 
                    },
                    { 
                        name: '💾 Database (MongoDB)', 
                        value: `\`\`\`yaml\nStatus:   ${dbState[mongoose.connection.readyState] || 'Unknown'}\nHost:     ${mongoose.connection.host || 'N/A'}\nModels:   ${mongoose.modelNames().length}\nDatabase: ${mongoose.connection.name}\`\`\``, 
                        inline: false 
                    },
                    {
                        name: '🌐 Global Reach',
                        value: `\`\`\`yaml\nServers:  ${interaction.client.guilds.cache.size.toLocaleString()}\nChannels: ${interaction.client.channels.cache.size.toLocaleString()}\nUsers:    ${interaction.client.users.cache.size.toLocaleString()}\`\`\``,
                        inline: false
                    }
                )
                .setFooter({ text: `Process ID: ${process.pid}` });
            return interaction.editReply({ embeds: [debugEmbed] });
        }

        if (subcommand === 'database') {
            let dbSize = 'Unknown';
            let userCount = 'Unknown';
            try {
                userCount = await User.countDocuments();
                const dbStats = await mongoose.connection.db.stats();
                dbSize = formatBytes(dbStats.storageSize);
            } catch (e) { console.error(e); }

            const dbEmbed = new EmbedBuilder()
                .setTitle('📂 Database Statistics')
                .setColor('#3498db')
                .addFields(
                    { name: 'Total Players', value: `${userCount}`, inline: true },
                    { name: 'Storage Size', value: `${dbSize}`, inline: true },
                    { name: 'Connection State', value: `${mongoose.connection.readyState === 1 ? 'Healthy ✅' : 'Warning ⚠️'}`, inline: true }
                )
                .setTimestamp();
            return interaction.editReply({ embeds: [dbEmbed] });
        }

        // --- SUBCOMMANDS WITH TARGET ---
        const targetUser = interaction.options.getUser('target');
        
        if (subcommand === 'wipe') {
             const result = await User.deleteOne({ userId: targetUser.id });
             const wipeEmbed = new EmbedBuilder()
                .setTitle('🗑️ Data Wipe Executed')
                .setColor('#e74c3c')
                .setDescription(result.deletedCount > 0 
                    ? `✅ **SUCCESS:** Deleted character data for **${targetUser.username}**.` 
                    : `⚠️ **WARNING:** No data found for **${targetUser.username}**.`);
             return interaction.editReply({ embeds: [wipeEmbed] });
        }

        let targetPlayer = await User.findOne({ userId: targetUser.id });
        if (!targetPlayer) {
            return interaction.editReply({
                content: `❌ **${targetUser.username}** does not have a character initialized.` 
            });
        }

        let replyTitle = 'Admin Action';
        let replyDescription = '';
        let embedColor = '#2ecc71';

        switch (subcommand) {
            case 'force_exit_combat':
                targetPlayer.inCombat = false;
                replyTitle = '🤺 Combat Override';
                replyDescription = `Successfully forced **${targetUser.username}** out of combat.`;
                embedColor = '#f1c40f';
                break;

            case 'dumpdata':
                const dataString = JSON.stringify(targetPlayer.toObject(), null, 2);
                const buffer = Buffer.from(dataString, 'utf-8');
                return interaction.editReply({
                    content: `✅ **Data Dump for ${targetUser.username}**`,
                    files: [{attachment: buffer, name: `${targetUser.username}_dump.json`}]
                });

            case 'resetstats':
                const refunded = targetPlayer.resetAllocatedStats(); 
                replyTitle = '🧬 Stats Reset';
                replyDescription = `Successfully reset stats for **${targetUser.username}**.\nRefunded **${refunded}** stat points.`;
                break;
            
            case 'takeitem':
                const iTake = interaction.options.getString('item_id').toLowerCase();
                const aTake = interaction.options.getInteger('amount') || 1;
                const friendlyNameTake = getItemName(iTake);
                const currentQty = targetPlayer.inventory.get(iTake) || 0;
                if (currentQty < aTake) {
                     targetPlayer.removeItem(iTake, currentQty);
                     replyTitle = '⚠️ Partial Removal';
                     replyDescription = `User only had **${currentQty}x** ${friendlyNameTake}. Removed all of them.`;
                     embedColor = '#f1c40f';
                } else {
                    targetPlayer.removeItem(iTake, aTake);
                    replyTitle = '➖ Item Removed';
                    replyDescription = `Removed **${aTake}x ${friendlyNameTake}** from **${targetUser.username}**.`;
                }
                break;
            
            case 'giveitem':
                const iGive = interaction.options.getString('item_id').toLowerCase();
                const aGive = interaction.options.getInteger('amount') || 1;
                const friendlyNameGive = getItemName(iGive);
                targetPlayer.addItem(iGive, aGive);
                replyTitle = '➕ Item Added';
                replyDescription = `Gave **${aGive}x ${friendlyNameGive}** to **${targetUser.username}**.`;
                break;
                
            case 'givegold':
                const gAmt = interaction.options.getInteger('amount');
                targetPlayer.gold += gAmt;
                replyTitle = '💰 Gold Injection';
                replyDescription = `Added **${gAmt.toLocaleString()}g** to **${targetUser.username}**.\nNew Balance: **${targetPlayer.gold.toLocaleString()}g**`;
                break;

            case 'set_gold':
                const sAmt = interaction.options.getInteger('amount');
                targetPlayer.gold = sAmt;
                replyTitle = '💰 Gold Set';
                replyDescription = `Set **${targetUser.username}**'s balance to **${sAmt.toLocaleString()}g**.`;
                break;

            case 'addexp':
                const expAmount = interaction.options.getInteger('amount');
                const addExpResult = await addExperience(targetPlayer, expAmount, 'player');
                replyTitle = '🆙 Player Experience Added';
                replyDescription = `Added **${expAmount.toLocaleString()} XP** to **${targetUser.username}**.`;
                
                const addExpEmbeds = [];
                if (addExpResult.playerLevelsGained > 0) {
                    replyDescription += `\n🎉 **LEVEL UP!** Gained **${addExpResult.playerLevelsGained}** levels. Current: **${targetPlayer.level}**`;
                    embedColor = '#9b59b6'; 
                    addExpEmbeds.push(LevelUpVisuals.createLevelUpEmbed(targetPlayer, addExpResult));
                }

                await targetPlayer.save();
                const addExpMainEmbed = new EmbedBuilder()
                    .setTitle(replyTitle)
                    .setDescription(replyDescription)
                    .setColor(embedColor)
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [addExpMainEmbed, ...addExpEmbeds] });

            case 'sim_levelup':
                const oldStatsSim = calculateEffectiveStats(targetPlayer);
                const fakeSummary = {
                    playerLevelsGained: 1,
                    classLevelsGained: 0,
                    oldStats: oldStatsSim,
                    newStats: null
                };
                targetPlayer.level += 1;
                fakeSummary.newStats = calculateEffectiveStats(targetPlayer);
                targetPlayer.level -= 1; 

                const growthEmbed = LevelUpVisuals.createLevelUpEmbed(targetPlayer, fakeSummary);
                replyTitle = '🧪 Level Up Simulation';
                replyDescription = `Showing level-up visual for **${targetUser.username}**.`;
                
                const simMainEmbed = new EmbedBuilder()
                    .setTitle(replyTitle)
                    .setDescription(replyDescription)
                    .setColor('#3498db')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [simMainEmbed, growthEmbed] });

            case 'addclassexp':
                const cExpAmount = interaction.options.getInteger('amount');
                const cResult = await addExperience(targetPlayer, cExpAmount, 'class');
                replyTitle = '🛡️ Class Experience Added';
                replyDescription = `Added **${cExpAmount.toLocaleString()} Class XP** to **${targetUser.username}**.`;
                
                const cExpEmbeds = [];
                if (cResult.classLevelsGained > 0) {
                    replyDescription += `\n🎉 **CLASS UP!** Gained **${cResult.classLevelsGained}** levels. Current: **${targetPlayer.classLevel}**`;
                    embedColor = '#DAA520'; 
                    cExpEmbeds.push(LevelUpVisuals.createLevelUpEmbed(targetPlayer, cResult));
                }

                await targetPlayer.save();
                const cExpMainEmbed = new EmbedBuilder()
                    .setTitle(replyTitle)
                    .setDescription(replyDescription)
                    .setColor(embedColor)
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [cExpMainEmbed, ...cExpEmbeds] });

            case 'setlevel':
                const lvlSet = interaction.options.getInteger('level');
                const oldLvl = targetPlayer.level;
                targetPlayer.level = lvlSet;
                targetPlayer.exp = 0; 
                replyTitle = '⚖️ Player Level Modified';
                if (lvlSet > oldLvl) {
                    const diff = lvlSet - oldLvl;
                    targetPlayer.unspentPoints += (diff * 5);
                    replyDescription = `Promoted **${targetUser.username}** to **Lv.${lvlSet}**. Granted **${diff * 5}** Stat Points.`;
                } else {
                    replyDescription = `Set **${targetUser.username}**'s Player Level to **${lvlSet}**.`;
                }
                break;
            
            case 'setclasslevel':
                const clvlSet = interaction.options.getInteger('level');
                targetPlayer.classLevel = clvlSet;
                targetPlayer.classExp = 0;
                replyTitle = '⚖️ Class Level Modified';
                replyDescription = `Set **${targetUser.username}**'s Class Level to **${clvlSet}**.`;
                break;

            case 'setclass':
                const newClassId = interaction.options.getString('class_id').toLowerCase();
                const classData = CLASSES[newClassId];
                if (!classData) {
                    replyTitle = '❌ Invalid Class';
                    replyDescription = `Class ID ${newClassId} not found.`;
                    embedColor = '#e74c3c';
                } else {
                    targetPlayer.class = newClassId;
                    targetPlayer.classLevel = 1;
                    targetPlayer.classExp = 0;
                    replyTitle = '🔄 Class Changed';
                    replyDescription = `Changed **${targetUser.username}** to **${classData.name}**.`;
                }
                break;

            case 'teleport':
                const regionId = interaction.options.getString('region_id').toLowerCase();
                const subRegionId = interaction.options.getString('subregion_id')?.toLowerCase();
                if (!REGIONS[regionId]) {
                    replyTitle = '❌ Invalid Region';
                    replyDescription = `Region ${regionId} not found.`;
                    embedColor = '#e74c3c';
                } else {
                    targetPlayer.region = regionId;
                    targetPlayer.travel.isTraveling = false;
                    const regionData = REGIONS[regionId];
                    if (subRegionId) {
                         const subExists = regionData.subRegions.find(s => s.id === subRegionId);
                         targetPlayer.subRegion = subExists ? subRegionId : regionData.subRegions[0].id;
                    } else {
                        targetPlayer.subRegion = regionData.subRegions[0].id;
                    }
                    replyTitle = '🚀 Teleport Successful';
                    replyDescription = `Moved **${targetUser.username}** to **${regionData.name}**.`;
                }
                break;

            case 'heal':
                const maxStats = calculateEffectiveStats(targetPlayer);
                targetPlayer.stats.hp = maxStats.maxHp;
                targetPlayer.stats.mana = maxStats.maxMana;
                targetPlayer.stats.stamina = maxStats.maxStamina;
                targetPlayer.markModified('stats');
                replyTitle = '❤️ Fully Healed';
                replyDescription = `Restored all vitals for **${targetUser.username}**.`;
                break;
                
            case 'check_inv':
                replyTitle = `🎒 Inventory: ${targetUser.username}`;
                embedColor = '#3498db';
                if (targetPlayer.inventory.size === 0) {
                    replyDescription = '*Inventory is empty.*';
                } else {
                    const items = [];
                    for (const [id, count] of targetPlayer.inventory.entries()) {
                         items.push(`${getItemName(id).padEnd(20)} x${count}`);
                    }
                    replyDescription = `\`\`\`\n${items.join('\n')}\n\`\`\``;
                }
                break;

            case 'check_cooldown':
                replyTitle = `⏳ Cooldowns: ${targetUser.username}`;
                embedColor = '#e67e22'; 
                let cdText = '';
                if (targetPlayer.cooldowns && targetPlayer.cooldowns.size > 0) {
                    for (const [key, timestamp] of targetPlayer.cooldowns.entries()) {
                        const unixTime = Math.floor(timestamp.getTime() / 1000);
                        cdText += `**${key.toUpperCase()}**: <t:${unixTime}:R>\n`;
                    }
                }
                replyDescription = cdText || '✅ No active cooldowns.';
                break;

            case 'mail_item':
                const mItemId = interaction.options.getString('item_id').toLowerCase();
                const mAmount = interaction.options.getInteger('amount');
                const mMsg = interaction.options.getString('message');
                const mType = interaction.options.getString('sender_type') || 'Anonymous';
                const mAlert = interaction.options.getString('alert') || 'yes';
                
                const mItemData = MASTER_ITEM_MAP[mItemId];
                if (!mItemData) {
                    replyTitle = '❌ Invalid Item';
                    replyDescription = `Item ID \`${mItemId}\` not found.`;
                    embedColor = '#e74c3c';
                } else {
                    targetPlayer.mailbox.push({ sender: mType, content: mMsg, gold: 0, attachments: [{ id: mItemId, amount: mAmount }], date: new Date() });
                    replyTitle = '📬 Item Mail Sent';
                    replyDescription = `Sent **${mAmount}x ${mItemData.name}** to **${targetUser.username}** (Sender: ${mType}).`;
                    
                    // Notify recipient
                    if (mAlert === 'yes') {
                        try {
                            const notifyEmbed = new EmbedBuilder()
                                .setTitle('📬 You\'ve Got Mail!')
                                .setDescription(`A **${mType.toLowerCase()} sender** has sent you an item in **Everlasting Journey**!`)
                                .addFields({ name: 'Message', value: `"${mMsg}"` })
                                .setColor('#3498db')
                                .setFooter({ text: 'Use /mail inbox to check your rewards.' });
                            await targetUser.send({ embeds: [notifyEmbed] });
                        } catch (e) {}
                    }
                }
                break;

            case 'mail_gold':
                const mgAmount = interaction.options.getInteger('amount');
                const mgMsg = interaction.options.getString('message');
                const mgType = interaction.options.getString('sender_type') || 'Anonymous';
                const mgAlert = interaction.options.getString('alert') || 'yes';

                targetPlayer.mailbox.push({ sender: mgType, content: mgMsg, gold: mgAmount, attachments: [], date: new Date() });
                replyTitle = '📬 Gold Mail Sent';
                replyDescription = `Sent **${mgAmount}g** to **${targetUser.username}** (Sender: ${mgType}).`;

                // Notify recipient
                if (mgAlert === 'yes') {
                    try {
                        const notifyEmbed = new EmbedBuilder()
                            .setTitle('📬 You\'ve Got Mail!')
                            .setDescription(`A **${mgType.toLowerCase()} sender** has sent you gold in **Everlasting Journey**!`)
                            .addFields({ name: 'Message', value: `"${mgMsg}"` })
                            .setColor('#f1c40f')
                            .setFooter({ text: 'Use /mail inbox to check your rewards.' });
                        await targetUser.send({ embeds: [notifyEmbed] });
                    } catch (e) {}
                }
                break;
        }
        
        await targetPlayer.save(); 
        const finalEmbed = new EmbedBuilder()
            .setTitle(replyTitle)
            .setDescription(replyDescription)
            .setColor(embedColor)
            .setTimestamp();
        await interaction.editReply({ embeds: [finalEmbed] });
    },
};