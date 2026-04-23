const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const packageJson = require('../../package.json');
const { getItemEmbed, findItem } = require('../utils/itemUtils');
const { MASTER_ITEM_LIST } = require('../data/shopItems');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('View detailed information about Everlasting Journey or a specific item.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The name or ID of an item to view details for.')
                .setRequired(false)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = MASTER_ITEM_LIST.filter(item => 
            item.name.toLowerCase().includes(focusedValue) || 
            item.id.toLowerCase().includes(focusedValue)
        ).slice(0, 25);

        await interaction.respond(
            choices.map(choice => ({ name: choice.name, value: choice.id })),
        );
    },

    async execute(interaction) {
        const queryInput = interaction.options.getString('item');

        if (queryInput) {
            try {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            } catch (e) {
                console.error('Failed to defer info item reply:', e);
                return;
            }
            const item = findItem(queryInput);

            if (!item) {
                return interaction.editReply({ 
                    content: `❌ Could not find an item matching "**${queryInput}**".`
                });
            }

            const user = await User.findOne({ userId: interaction.user.id });
            const embed = getItemEmbed(item, user);
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            await interaction.deferReply();
        } catch (e) {
            console.error('Failed to defer info reply:', e);
            return;
        }

        const client = interaction.client;
        const botUser = client.user;
        const developerId = process.env.ADMIN_USER_ID || '123456789012345678';
        
        const totalServers = client.guilds.cache.size;
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        const infoEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`✨ Welcome to Everlasting Journey`)
            .setThumbnail(botUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(
                `**Everlasting Journey** is a comprehensive Discord-based RPG designed to bring a deep, persistent adventure experience directly to your server. \n\n` +
                `Step into a world of endless possibilities where every action shapes your legend. Whether you're a casual gatherer or a hardcore dungeon conqueror, there is a place for you in these lands.\n\n` +
                `🛡️ **Forge Your Path**\n` +
                `Choose from unique classes and level up both your character and your mastery. Allocate attribute points to specialize your build—be it a high-speed assassin or a sturdy tank.\n\n` +
                `🌿 **Master the Professions**\n` +
                `Explore diverse regions to chop rare woods, mine precious ores, or fish in tranquil waters. Use our advanced **Gathering Manager** to find resources and craft powerful equipment at local blacksmiths.\n\n` +
                `⚖️ **A Living Economy**\n` +
                `Trade your findings with other players in the global **Auction House**. List your items, set your prices, and build your fortune through a player-driven market.\n\n` +
                `🔮 **Uncover Ancient Power**\n` +
                `Conquer dangerous dungeons to find mystical **Relics** and **Unique Items** with randomized stats and set bonuses. Enhance them using Essence to reach new heights of power.`
            )
            .addFields(
                { 
                    name: '📈 Global Statistics', 
                    value: `\`\`\`list\nServers: ${totalServers.toLocaleString()}\nPlayers: ${totalMembers.toLocaleString()}\nVersion: v${packageJson.version || '1.0.0'}\`\`\``, 
                    inline: true 
                },
                { 
                    name: '👨‍💻 Development', 
                    value: `Created by <@${developerId}>\nBuilt with **Discord.js** & **Mongoose**\nActive since 2024`, 
                    inline: true 
                }
            )
            .setFooter({ text: `Type /help to begin your adventure • ${botUser.username}`, iconURL: botUser.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Support Server')
                    .setURL('https://discord.gg/yourlink')
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Invite Bot')
                    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
                    .setStyle(ButtonStyle.Link)
            );

        await interaction.editReply({ embeds: [infoEmbed], components: [row] });
    },
};