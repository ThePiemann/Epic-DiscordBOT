const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const CATEGORIES = {
    adventure: {
        label: '🗺️ Adventure & Gathering',
        description: 'Explore the world, travel between regions, and gather resources.',
        emoji: '🗺️',
        commands: ['explore', 'travel', 'location', 'region', 'carriage', 'chop', 'fish', 'mine', 'forage', 'search']
    },
    combat: {
        label: '⚔️ Combat & Dungeons',
        description: 'Fight enemies, conquer dungeons, and manage your vitals.',
        emoji: '⚔️',
        commands: ['fight', 'dungeon', 'heal', 'rest', 'salvage']
    },
    character: {
        label: '👤 Character & Progression',
        description: 'View your profile, manage equipment, and level up your skills.',
        emoji: '👤',
        commands: ['profile', 'stats', 'inventory', 'equip', 'unequip', 'class', 'allocate', 'train', 'job', 'relic', 'quests']
    },
    economy: {
        label: '💰 Economy & Trading',
        description: 'Buy, sell, trade, and manage your wealth in the bank.',
        emoji: '💰',
        commands: ['shop', 'sell', 'trade', 'auction', 'bank', 'daily', 'redeem']
    },
    social: {
        label: '✉️ Social & Info',
        description: 'Communicate with others and view game information.',
        emoji: '✉️',
        commands: ['mail', 'help', 'info', 'start', 'tutorial', 'boost']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('The ultimate guide to Everlasting Journey.')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('View a specific category of commands.')
                .setRequired(false)
                .addChoices(
                    { name: 'Adventure', value: 'adventure' },
                    { name: 'Combat', value: 'combat' },
                    { name: 'Character', value: 'character' },
                    { name: 'Economy', value: 'economy' },
                    { name: 'Social', value: 'social' }
                )),

    async execute(interaction) {
        const categoryInput = interaction.options ? interaction.options.getString('category') : null;

        if (categoryInput) {
            const { embed, components } = this.generateHelpPage(interaction.client, categoryInput);
            return interaction.reply({ embeds: [embed], components: components, flags: [MessageFlags.Ephemeral] });
        }

        const { embed, components } = this.generateMainPage();
        await interaction.reply({ embeds: [embed], components: components, flags: [MessageFlags.Ephemeral] });
    },

    async handleSelectMenu(interaction, action, args) {
        if (action === 'category') {
            const category = interaction.values[0];
            const { embed, components } = this.generateHelpPage(interaction.client, category);
            await interaction.update({ embeds: [embed], components: components });
        }
    },

    async handleButton(interaction, action, args) {
        if (action === 'home') {
            const { embed, components } = this.generateMainPage();
            await interaction.update({ embeds: [embed], components: components });
        } else if (action === 'delete') {
            try {
                await interaction.deferUpdate();
                await interaction.deleteReply();
            } catch (e) {
                // If it's not a reply that can be deleted this way, just try to clear it
                await interaction.editReply({ content: 'Help menu closed.', embeds: [], components: [] });
            }
        }
    },

    generateMainPage() {
        const embed = new EmbedBuilder()
            .setTitle('📚 Everlasting Journey: Master Guide')
            .setDescription(
                `Welcome, adventurer! **Everlasting Journey** is a deep RPG experience with dozens of features. Use the menu below to navigate through the command categories.\n\n` +
                `🛡️ **Getting Started**\n` +
                `1. Use \`/start\` to create your character.\n` +
                `2. Type \`/tutorial\` to learn the basics.\n` +
                `3. Use \`/profile\` to check your current status.\n` +
                `4. Head to \`/explore\` to begin your first hunt!`
            )
            .setColor('#3498db')
            .addFields(
                { name: '🗺️ Exploration', value: 'Find resources and travel.', inline: true },
                { name: '⚔️ Combat', value: 'Battle monsters and bosses.', inline: true },
                { name: '💰 Wealth', value: 'Trade and store items.', inline: true }
            )
            .setFooter({ text: 'Tip: Use the menu to explore different categories.' });

        return { embed, components: this.getMenuComponents('home') };
    },

    getMenuComponents(currentValue) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId('help:category')
            .setPlaceholder('Select a category to view commands...')
            .addOptions(
                Object.entries(CATEGORIES).map(([id, cat]) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cat.label.replace(/[^a-zA-Z0-9 ]/g, '').trim())
                        .setDescription(cat.description)
                        .setEmoji(cat.emoji)
                        .setValue(id)
                )
            );

        const menuRow = new ActionRowBuilder().addComponents(menu);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help:home')
                    .setLabel('🏠 Home')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentValue === 'home'),
                new ButtonBuilder()
                    .setCustomId('help:delete')
                    .setLabel('🗑️ Close')
                    .setStyle(ButtonStyle.Danger)
            );

        return [menuRow, buttons];
    },

    generateHelpPage(client, categoryId) {
        const category = CATEGORIES[categoryId];
        const commands = client.commands;

        const embed = new EmbedBuilder()
            .setTitle(`${category.label} Commands`)
            .setDescription(category.description)
            .setColor('#2ecc71');

        category.commands.forEach(cmdName => {
            const cmd = commands.get(cmdName);
            if (cmd) {
                embed.addFields({
                    name: `/${cmd.data.name}`,
                    value: cmd.data.description || 'No description available.',
                    inline: false
                });
            }
        });

        return { 
            embed, 
            components: this.getMenuComponents(categoryId)
        };
    }
};