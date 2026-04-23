const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_LIST, MASTER_ITEM_MAP } = require('../data/shopItems');
const { getItemEmbed, getTypeEmoji, findItem } = require('../utils/itemUtils');

const ITEMS_PER_PAGE = 10;

function getItemListPage(page = 0) {
    const maxPages = Math.ceil(MASTER_ITEM_LIST.length / ITEMS_PER_PAGE) - 1;
    page = Math.max(0, Math.min(page, maxPages));

    const startIndex = page * ITEMS_PER_PAGE;
    const itemsOnPage = MASTER_ITEM_LIST
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle('📖 Item Encyclopedia')
        .setDescription(`Use \`/item query <name_or_id>\` or \`/info <item>\` for more details.`)
        .setColor('#3498db')
        .setFooter({ text: `Page ${page + 1} of ${maxPages + 1} | Total Items: ${MASTER_ITEM_LIST.length}` });

    itemsOnPage.forEach(item => {
        const emoji = getTypeEmoji(item.type);
        embed.addFields({
            name: `${emoji} ${item.name}`,
            value: `🆔 \`${item.id}\` | Rarity: **${item.rarity || 'Common'}**`,
            inline: false 
        });
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`item:page:${page - 1}`)
                .setLabel('⬅️ Prev')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`item:page:${page + 1}`)
                .setLabel('Next ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= maxPages),
        );
        
    return { embed, row };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('item')
        .setDescription('View information about items in the game.')
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('View a paginated list of all items.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('query')
                .setDescription('View detailed info about a specific item.')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('The name or ID of the item.')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        if (!focusedValue) {
            return interaction.respond(
                MASTER_ITEM_LIST.slice(0, 25).map(i => ({ name: i.name, value: i.id }))
            );
        }

        const choices = [];
        for (const item of MASTER_ITEM_LIST) {
            if (item.name.toLowerCase().includes(focusedValue) || item.id.toLowerCase().includes(focusedValue)) {
                choices.push({ name: item.name, value: item.id });
                if (choices.length >= 25) break;
            }
        }

        await interaction.respond(choices);
    },

    async handleButton(interaction, action, args) {
        if (action !== 'page') return;
        try {
            const targetPage = parseInt(args[0]);
            const { embed, row } = getItemListPage(targetPage);
            await interaction.update({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Item Button Error:', error);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            const { embed, row } = getItemListPage(0);
            return interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === 'query') {
            try {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            } catch (e) {
                console.error('Failed to defer item reply:', e);
                return;
            }
            const queryInput = interaction.options.getString('item');
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
    }
};