const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const CLASSES = require('../data/classes');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('class')
        .setDescription('View your current Class details or Ascend to a higher tier'),

    async handleSelectMenu(interaction, action, args) {
        if (action !== 'ascend') return;

        const user = await User.findOne({ userId: interaction.user.id });
        const targetClassId = interaction.values[0];
        const targetClass = CLASSES[targetClassId];

        if (!user || !targetClass) return interaction.reply({ content: 'Invalid selection.', flags: [MessageFlags.Ephemeral] });

        // Ensure classLevel exists
        if (user.classLevel === undefined) user.classLevel = 1;

        // Verify Requirement Again
        if (targetClass.requirements) {
            const reqLvl = targetClass.requirements.classLevel || 0;
            if (user.classLevel < reqLvl) {
                return interaction.reply({ content: `You need Class Level ${reqLvl} to ascend to ${targetClass.name}.`, flags: [MessageFlags.Ephemeral] });
            }
            if (targetClass.requirements.class && user.class !== targetClass.requirements.class) {
                return interaction.reply({ content: `You must be a ${CLASSES[targetClass.requirements.class].name} to ascend to this class.`, flags: [MessageFlags.Ephemeral] });
            }
        }

        const oldClass = CLASSES[user.class];
        
        // PERFORM ASCENSION
        user.class = targetClassId;
        user.classLevel = 1; // Reset Class Level
        user.classExp = 0;   // Reset Class Exp
        
        await user.save();

        const successEmbed = new EmbedBuilder()
            .setTitle('🌟 ASCENSION SUCCESSFUL!')
            .setDescription(`**${interaction.user.username}** has evolved from **${oldClass.name}** to **${targetClass.name}**!`)
            .addFields(
                { name: 'New Title', value: targetClass.name, inline: true },
                { name: 'Tier', value: `${targetClass.tier}`, inline: true },
                { name: 'Status', value: 'Class Level reset to 1. New potential unlocked.' }
            )
            .setColor('#FFD700')
            .setImage('https://media1.tenor.com/m/m1F0t-A5t1EAAAAC/solo-leveling-sung-jin-woo.gif'); 

        await interaction.update({ components: [] }); 
        await interaction.followUp({ embeds: [successEmbed] });
    },

    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        // Ensure classLevel exists (migration)
        if (user.classLevel === undefined) user.classLevel = 1;

        const classData = CLASSES[user.class];
        if (!classData) {
            return interaction.reply({ content: `Unknown Class: ${user.class}`, flags: [MessageFlags.Ephemeral] });
        }

        const growth = classData.growthStats;

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ Class: ${classData.name} (Tier ${classData.tier || 1})`)
            .setDescription(`*${classData.description}*`)
            .setColor('#DAA520')
            .addFields(
                {
                    name: '📊 Growth Rates (per Class Level)',
                    value: `❤️ **HP:** +${growth.maxHp}\n⚔️ **ATK:** +${growth.atk || 0}\n🛡️ **DEF:** +${growth.def || 0}\n✨ **MATK:** +${growth.matk || 0}\n💧 **Mana:** +${growth.maxMana || 0}`,
                    inline: false
                },
                {
                    name: '💪 Your Status',
                    value: `**Player Level:** ${user.level}\n**Class Level:** ${user.classLevel}\n**STR:** ${user.allocatedStats.str}\n**INT:** ${user.allocatedStats.int}\n**DEX:** ${user.allocatedStats.dex}\n**CON:** ${user.allocatedStats.con}`,
                    inline: true
                }
            )
            .setFooter({ text: 'Use /stats to see full character attributes.' });

        // --- CHECK PROMOTIONS ---
        const promotions = classData.promotions || [];
        // Filter: Must match Class Level requirement (not Player Level)
        const availablePromotions = promotions.map(id => CLASSES[id]).filter(p => p && (!p.requirements || user.classLevel >= (p.requirements.classLevel || 0)));

        const components = [];

        if (availablePromotions.length > 0) {
            embed.addFields({
                name: '🌟 Ascension Available!',
                value: `You have mastered the **${classData.name}** arts enough to evolve.\nSelect a path below.`
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('class:ascend')
                .setPlaceholder('Choose your Ascension...')
                .addOptions(availablePromotions.map(p => ({
                    label: p.name,
                    description: `Tier ${p.tier} - ${p.description.substring(0, 50)}...`,
                    value: p.id
                })));

            components.push(new ActionRowBuilder().addComponents(selectMenu));
        } else if (promotions.length > 0) {
            // Show potential next classes even if not unlocked
            const nextClasses = promotions.map(id => CLASSES[id]).filter(c => c);
            if (nextClasses.length > 0) {
                const nextNames = nextClasses.map(c => `${c.name} (Class Lvl ${c.requirements ? c.requirements.classLevel : '??'})`).join(', ');
                embed.addFields({ name: '🔒 Future Promotions', value: nextNames });
            }
        }

        await interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
    }
};