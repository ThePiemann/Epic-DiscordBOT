const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const REGIONS = require('../data/regions');
const { calculateEffectiveStats } = require('../systems/stats');
const ENEMIES = require('../data/enemies');
const CombatManager = require('../features/CombatManager');

const DIFFICULTIES = [
    { id: 1, name: 'Easy', level: 1, label: '🟢 Easy (Lv. 1+)' },
    { id: 2, name: 'Normal', level: 15, label: '🟡 Normal (Lv. 15+)' },
    { id: 3, name: 'Hard', level: 30, label: '🔴 Hard (Lv. 30+)' },
    { id: 4, name: 'Master', level: 50, label: '🟣 Master (Lv. 50+)' }
];

function generateWaveEnemies(user, place, difficulty = null) {
    const waves = [];
    const numWaves = place.waves || 1;
    const enemyPool = place.enemy_pool || ['slime'];

    for (let i = 0; i < numWaves; i++) {
        const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
        const enemyTemplate = ENEMIES.find(e => e.id === enemyId) || ENEMIES[0];
        
        let enemyLevel = 1;
        
        if (difficulty) {
            if (difficulty === 1) enemyLevel = Math.max(1, user.level - 5);
            else if (difficulty === 2) enemyLevel = 20;
            else if (difficulty === 3) enemyLevel = 40;
            else if (difficulty === 4) enemyLevel = 60;
        } else {
            const levelVariance = Math.floor(Math.random() * 6) + 5; 
            if (enemyTemplate.type === 'elite' || enemyTemplate.type === 'boss' || i === numWaves - 1) {
                enemyLevel = user.level + levelVariance;
            } else {
                enemyLevel = Math.max(1, user.level - levelVariance);
            }
        }

        const scaleFactor = enemyLevel - 1;
        const dungeonMultiplier = place.type === 'dungeon' ? 1.5 : 1.0;

        waves.push({
            ...enemyTemplate,
            level: enemyLevel,
            hp: Math.floor(enemyTemplate.hp * (1 + (scaleFactor * 0.12)) * dungeonMultiplier),
            atk: Math.floor(enemyTemplate.atk * (1 + (scaleFactor * 0.06)) * dungeonMultiplier),
            matk: Math.floor((enemyTemplate.matk || 0) * (1 + (scaleFactor * 0.06)) * dungeonMultiplier),
            def: Math.floor((enemyTemplate.def || 0) * (1 + (scaleFactor * 0.06)) * dungeonMultiplier),
            mdef: Math.floor((enemyTemplate.mdef || 0) * (1 + (scaleFactor * 0.06)) * dungeonMultiplier),
            expReward: Math.floor(enemyTemplate.expReward * (1 + (scaleFactor * 0.1)) * dungeonMultiplier),
            goldReward: Math.floor(enemyTemplate.goldReward * (1 + (scaleFactor * 0.1)) * dungeonMultiplier)
        });
    }
    return waves;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enter')
        .setDescription('Enter a specific place or return to the wilds.')
        .addStringOption(option => 
            option.setName('place')
                .setDescription('The ID of the place or "wilds"')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        try {
            const user = await User.findOne({ userId: interaction.user.id }).lean();
            if (!user) return interaction.respond([]);

            const region = REGIONS[user.region];
            if (!region || !region.subRegions) return interaction.respond([]);

            const subRegion = region.subRegions.find(s => s.id === user.subRegion);
            if (!subRegion || !subRegion.places) return interaction.respond([]);

            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // Add "Wilds" as an explicit option
            const choices = [
                { name: '🌲 The Wilds', value: 'wilds' },
                ...subRegion.places.map(p => ({ name: p.name, value: p.id }))
            ];
            
            const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue));
            await interaction.respond(filtered.slice(0, 25));
        } catch (error) {
            console.error('Autocomplete Error in Enter:', error);
            try {
                await interaction.respond([]);
            } catch (e) {}
        }
    },

    async handleButton(interaction, action, args) {
        if (action === 'place') {
            await interaction.deferUpdate();
            const placeId = args[0];
            return this.enterPlace(interaction, placeId);
        }

        if (action === 'diff') {
            const placeId = args[0];
            const difficulty = parseInt(args[1]);
            return this.startDungeon(interaction, placeId, difficulty);
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const placeId = interaction.options.getString('place');
        return this.enterPlace(interaction, placeId);
    },

    async enterPlace(interaction, placeId) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply({ content: 'Use `/start` first!' });

        if (user.inCombat) return interaction.editReply({ content: '❌ You are already in combat!' });

        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);

        // --- HANDLE WILDERNESS ---
        if (placeId === 'wilds') {
            user.currentPlace = null;
            await user.save();
            const embed = new EmbedBuilder()
                .setTitle('🌲 Into the Wilds')
                .setDescription(`You step out into the open wilderness of **${subRegion.name}**.`)
                .setColor('#2ecc71');
            return interaction.editReply({ embeds: [embed], components: [] });
        }

        const place = subRegion.places ? subRegion.places.find(p => p.id === placeId) : null;

        if (!place) {
            return interaction.editReply({ content: 'That place is not here.' });
        }

        if (place.type === 'dungeon') {
            if (user.stats.hp < (user.stats.maxHp * 0.2)) {
                return interaction.editReply({ content: "⚠️ You are too injured to enter this dungeon! Heal up first." });
            }

            // Show Difficulty Selection
            const embed = new EmbedBuilder()
                .setTitle(`⚔️ Dungeon: ${place.name}`)
                .setDescription(`${place.description}\n\nSelect your difficulty. Higher difficulties offer better rewards but stronger enemies.`)
                .setColor('#e74c3c')
                .setFooter({ text: 'Warning: You cannot flee from dungeons easily.' });

            const row = new ActionRowBuilder();
            DIFFICULTIES.forEach(d => {
                const isLocked = user.level < d.level;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`enter:diff:${placeId}:${d.id}`)
                        .setLabel(d.label)
                        .setStyle(isLocked ? ButtonStyle.Secondary : ButtonStyle.Danger)
                        .setDisabled(isLocked)
                );
            });

            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        user.currentPlace = placeId;
        const s = calculateEffectiveStats(user);
        if (user.processRegen(s)) {
            await user.save();
        }

        await user.save();

        let embedColor = '#2ecc71';
        let footerText = 'Safe Zone';
        
        const embed = new EmbedBuilder()
            .setTitle(`You have entered ${place.name}`)
            .setDescription(place.description)
            .addFields({ name: 'Available Actions', value: place.features.join(', ').toUpperCase() })
            .setColor(embedColor)
            .setFooter({ text: footerText });

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async startDungeon(interaction, placeId, difficulty) {
        if (interaction.isButton()) {
            await interaction.deferUpdate();
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user || user.inCombat) return;

        const region = REGIONS[user.region];
        const subRegion = region.subRegions.find(s => s.id === user.subRegion);
        const place = subRegion.places ? subRegion.places.find(p => p.id === placeId) : null;

        if (!place || place.type !== 'dungeon') return;

        user.currentPlace = placeId;
        user.inCombat = true;
        await user.save();

        const waves = generateWaveEnemies(user, place, difficulty);
        const battle = new CombatManager(interaction, user, waves);
        return await battle.start();
    }
};