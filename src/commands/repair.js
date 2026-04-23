const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { TOOLS } = require('../data/tools');
const REGIONS = require('../data/regions');
const { checkStatus } = require('../utils/checks');

const REPAIR_COST_PER_POINT = 2;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('repair')
        .setDescription('Repair your tools at a blacksmith.')
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('Check the durability of your tools and repair costs.')
        )
        .addSubcommand(sub => sub
            .setName('tool')
            .setDescription('Repair a specific tool.')
            .addStringOption(opt => opt.setName('tool_id').setDescription('The ID of the tool to repair (e.g., wooden_pickaxe)').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('all')
            .setDescription('Repair all damaged tools in your inventory.')
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        if (!(await checkStatus(interaction, user))) return;

        // --- BLACKSMITH CHECK ---
        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const currentPlace = subRegion.places ? subRegion.places.find(p => p.id === user.currentPlace) : null;

        if (!currentPlace || !currentPlace.features.includes('blacksmith')) {
            return interaction.editReply("❌ You need a **Blacksmith** to repair tools! Visit a town first.");
        }

        const subcommand = interaction.options.getSubcommand();

        // Find all tools the user has that are damaged
        const damagedTools = [];
        for (const [toolId, durability] of user.toolDurability.entries()) {
            const toolData = TOOLS.find(t => t.id === toolId);
            if (toolData && durability < toolData.maxDurability) {
                const missing = toolData.maxDurability - durability;
                const cost = missing * REPAIR_COST_PER_POINT;
                damagedTools.push({ ...toolData, currentDurability: durability, missing, cost });
            }
        }

        if (subcommand === 'view') {
            const embed = new EmbedBuilder()
                .setTitle('⚒️ Blacksmith Services')
                .setDescription('The blacksmith inspects your gear...')
                .setColor('#7f8c8d');

            if (damagedTools.length === 0) {
                embed.addFields({ name: 'Status', value: 'All your tools are in perfect condition! ✨' });
            } else {
                damagedTools.forEach(t => {
                    embed.addFields({
                        name: `${t.name}`,
                        value: `🛡️ Durability: ${t.currentDurability}/${t.maxDurability}
💰 Repair Cost: **${t.cost} Gold**`,
                        inline: false
                    });
                });
                embed.setFooter({ text: 'Use /repair all or /repair tool <id> to fix them.' });
            }
            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'tool') {
            const toolId = interaction.options.getString('tool_id').toLowerCase();
            const target = damagedTools.find(t => t.id === toolId);

            if (!target) {
                return interaction.editReply(`❌ You don't have a damaged **${toolId}** in your pack.`);
            }

            if (user.gold < target.cost) {
                return interaction.editReply(`❌ You need **${target.cost} Gold** to repair your ${target.name}.`);
            }

            user.gold -= target.cost;
            user.toolDurability.set(target.id, target.maxDurability);
            await user.save();

            return interaction.editReply(`✅ The blacksmith hammers away and restores your **${target.name}** to full durability! (Cost: ${target.cost} Gold)`);
        }

        if (subcommand === 'all') {
            const totalCost = damagedTools.reduce((sum, t) => sum + t.cost, 0);

            if (damagedTools.length === 0) {
                return interaction.editReply('Your tools are already in top shape!');
            }

            if (user.gold < totalCost) {
                return interaction.editReply(`❌ You need **${totalCost} Gold** to repair all your tools.`);
            }

            user.gold -= totalCost;
            damagedTools.forEach(t => {
                user.toolDurability.set(t.id, t.maxDurability);
            });
            await user.save();

            return interaction.editReply(`✅ You paid **${totalCost} Gold** to have all **${damagedTools.length}** of your tools restored to perfection!`);
        }
    }
};