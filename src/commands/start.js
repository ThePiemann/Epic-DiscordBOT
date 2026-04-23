const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const CLASSES = require('../data/classes');
const { calculateEffectiveStats } = require('../systems/stats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Create your RPG character')
        .addStringOption(option =>
            option.setName('class')
                .setDescription('Choose your class')
                .setRequired(true)
                .addChoices(
                    ...Object.values(CLASSES)
                        .filter(c => c.tier === 1) // Only Tier 1
                        .map(c => ({ name: c.name, value: c.id }))
                )),
    async execute(interaction) {
        // 1. Defer immediately
        await interaction.deferReply(); 

        try {
            const selectedClassId = interaction.options.getString('class');
            const classData = CLASSES[selectedClassId];
            const userId = interaction.user.id;

            if (!classData) return interaction.editReply('Invalid class selection.');

            // Check if user exists
            let user = await User.findOne({ userId });
            if (user) {
                return interaction.editReply('You already have a character! Use `/profile` to check stats.');
            }

            // Create new user with basic structure
            user = new User({
                userId,
                username: interaction.user.username,
                class: selectedClassId,
                inventory: {}, 
                gold: 100, // Give some starting gold
                level: 1, 
                exp: 0, 
                unspentPoints: 0, 
                allocatedStats: { str: 0, int: 0, con: 0, dex: 0 },
                tutorialStep: 0,
                equipment: {
                    weapon: null,
                    head: null,
                    chest: null,
                    legs: null,
                    feet: null,
                    accessory: null
                }
            });

            // Assign starter weapon based on class
            let starterWeapon = 'starter_sword';
            if (selectedClassId === 'mage') starterWeapon = 'starter_staff';
            else if (selectedClassId === 'rogue') starterWeapon = 'rusty_dagger';
            else if (selectedClassId === 'paladin') starterWeapon = 'starter_sword';

            user.equipment.set('weapon', starterWeapon);

            // Calculate Effective Stats (includes Class Bonuses and Weapon)
            const effectiveStats = calculateEffectiveStats(user);

            // Apply calculated stats to the DB document
            user.stats.maxHp = effectiveStats.maxHp;
            user.stats.hp = effectiveStats.maxHp; // Full HP
            
            user.stats.maxMana = effectiveStats.maxMana;
            user.stats.mana = effectiveStats.maxMana; // Full Mana
            
            user.stats.maxStamina = effectiveStats.maxStamina;
            user.stats.stamina = effectiveStats.maxStamina; // Full Stamina

            user.stats.atk = effectiveStats.atk;
            user.stats.def = effectiveStats.def;
            user.stats.matk = effectiveStats.matk;
            user.stats.mdef = effectiveStats.mdef;
            user.stats.spd = effectiveStats.spd;

            await user.save();

            const embed = new EmbedBuilder()
                .setTitle('Character Created! ⚔️')
                .setDescription(`Welcome, brave **${classData.name}**!\n*${classData.description}*\n\nYour journey begins now.\n\n💡 **New here?** Use \`/tutorial\` to learn the basics and earn rewards!`)
                .setColor('#00FF00')
                .addFields(
                    { name: '❤️ HP', value: `${effectiveStats.maxHp}/${effectiveStats.maxHp}`, inline: true },
                    { name: '⚔️ Attack', value: `${effectiveStats.atk}`, inline: true },
                    { name: '🛡️ Defense', value: `${effectiveStats.def}`, inline: true },
                    { name: '⚡ Stamina', value: `${effectiveStats.maxStamina}/${effectiveStats.maxStamina}`, inline: true },
                    { name: '💧 Mana', value: `${effectiveStats.maxMana}/${effectiveStats.maxMana}`, inline: true }
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Something went wrong while creating your character.' });
        }
    },
};