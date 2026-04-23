const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const ENEMIES = require('../data/enemies');
const CombatManager = require('../features/CombatManager');
const { checkStatus, advanceTutorial } = require('../utils/checks');
const REGIONS = require('../data/regions');
const { calculateEffectiveStats } = require('../systems/stats');

function getRandomEnemy(user) {
    // 1. Filter by Region & SubRegion
    const regionEnemies = ENEMIES.filter(e => 
        e.region === user.region && 
        e.sub_region === user.subRegion
    );

    if (regionEnemies.length === 0) {
        const possibleEnemies = ENEMIES.filter(e => user.level >= e.minLevel);
        return possibleEnemies.length > 0 ? possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)] : ENEMIES[0];
    }

    const randomIndex = Math.floor(Math.random() * regionEnemies.length);
    return regionEnemies[randomIndex];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fight')
        .setDescription('Hunt for a random enemy to battle!'),

    async execute(interaction) {
        await interaction.deferReply(); 

        try {
            const user = await User.findOne({ userId: interaction.user.id });
            if (!user) {
                return interaction.editReply('Use `/start` to create a character first!');
            }

            if (!(await checkStatus(interaction, user))) return;

            // 1.5 CHECK LOCATION SAFETY
            if (user.currentPlace) {
                const region = REGIONS[user.region];
                const subRegion = region.subRegions.find(s => s.id === user.subRegion);
                const place = subRegion?.places?.find(p => p.id === user.currentPlace);

                if (place && !place.features.includes('combat')) {
                    return interaction.editReply(`🚫 This is a safe zone! You cannot fight in **${place.name}**. Go to a dungeon or the wilderness.`);
                }
            }

            // Set true before battle
            user.inCombat = true; 
            await user.save();

            // 2. Select Random Enemy
            const enemyTemplate = getRandomEnemy(user); 
            
            // --- NEW ENEMY SCALING ---
            let enemyLevel = 1;
            const levelVariance = Math.floor(Math.random() * 6) + 5; // 5 to 10

            if (enemyTemplate.type === 'elite' || enemyTemplate.type === 'boss') {
                enemyLevel = user.level + levelVariance;
            } else {
                enemyLevel = Math.max(1, user.level - levelVariance);
            }

            const scaleFactor = enemyLevel - 1; 
            
            const enemyData = { 
                ...enemyTemplate,
                level: enemyLevel,
                hp: Math.floor(enemyTemplate.hp * (1 + (scaleFactor * 0.12))),
                atk: Math.floor(enemyTemplate.atk * (1 + (scaleFactor * 0.06))),
                matk: Math.floor((enemyTemplate.matk || 0) * (1 + (scaleFactor * 0.06))),
                def: Math.floor((enemyTemplate.def || 0) * (1 + (scaleFactor * 0.06))),
                mdef: Math.floor((enemyTemplate.mdef || 0) * (1 + (scaleFactor * 0.06))),
                expReward: Math.floor(enemyTemplate.expReward * (1 + (scaleFactor * 0.1))),
                goldReward: Math.floor(enemyTemplate.goldReward * (1 + (scaleFactor * 0.1)))
            }; 

            // 🕒 Process Regeneration
            const s = calculateEffectiveStats(user);
            if (user.processRegen(s)) {
                await user.save();
            }

            // 📖 Tutorial Progress: Step 4 (Index 3 in TUTORIAL_STEPS)
            const tutorialEmbed = await advanceTutorial(user, 3, interaction, '50 Gold', (u) => { u.gold += 50; });

            // 3. Start Combat Manager (Pass tutorialEmbed)
            const battle = new CombatManager(interaction, user, enemyData, tutorialEmbed);
            await battle.start();

        } catch (error) {
            console.error('Error in fight command:', error);
            await interaction.editReply('An error occurred while starting the battle.');
        }
    }
};