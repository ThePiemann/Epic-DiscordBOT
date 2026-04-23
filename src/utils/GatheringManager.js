const { EmbedBuilder, MessageFlags } = require('discord.js');
const REGIONS = require('../data/regions');
const { getBestTool } = require('../data/tools');
const { checkStatus } = require('../utils/checks');
const { addActivityXp } = require('../systems/xp');
const { reduceToolDurability } = require('../utils/itemUtils');
const { updateQuestProgress } = require('../systems/questSystem');
const { getCurrentTimeAndWeather } = require('../systems/timeWeather');

class GatheringManager {
    /**
     * Executes a generic gathering action.
     * @param {Object} interaction - Discord interaction
     * @param {Object} user - User document
     * @param {Object} config - Configuration for the specific action
     */
    static async execute(interaction, user, config) {
        const {
            actionName,       // e.g., 'chop'
            actionEmoji,      // e.g., '🪓'
            toolType,         // e.g., 'axe' (null for foraging/searching)
            resourceType,     // e.g., 'forage', 'mine', 'fish'
            cooldownMs,       // Base cooldown
            color,            // Embed color
            requireWilderness = true // Whether it's blocked in towns
        } = config;

        const actualResourceType = resourceType === 'chop' ? 'chop' : resourceType;

        if (!(await checkStatus(interaction, user))) return;

        // 1. Location Check
        const regionData = REGIONS[user.region];
        const subRegionData = regionData ? regionData.subRegions.find(s => s.id === user.subRegion) : null;
        const currentPlace = subRegionData?.places?.find(p => p.id === user.currentPlace);

        if (requireWilderness && currentPlace && (currentPlace.type === 'town' || currentPlace.type === 'city')) {
            return interaction.editReply(`❌ The town guards won't let you ${actionName} here! Go to the wilderness.`);
        }

        if (!subRegionData || !subRegionData.resources || !subRegionData.resources[resourceType] || subRegionData.resources[resourceType].length === 0) {
            return interaction.editReply(`🤷 This area (**${subRegionData ? subRegionData.name : 'Unknown'}**) has no resources for ${actionName}ing.`);
        }

        // 2. Cooldown Check
        const now = new Date();
        const lastAction = user.cooldowns.get(actionName);
        if (lastAction && (now.getTime() - lastAction.getTime()) < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - (now.getTime() - lastAction.getTime())) / 1000);
            return interaction.editReply(`${actionEmoji} You are tired. Wait **${remaining}s**.`);
        }

        // 3. Tool Check
        let tool = null;
        if (toolType) {
            tool = getBestTool(user.inventory, toolType);
            if (!tool) {
                const toolName = toolType.charAt(0).toUpperCase() + toolType.slice(1);
                return interaction.editReply(`${actionEmoji} You need a **${toolName}** in your inventory!`);
            }
        }

        // 4. Weather & Efficiency
        const { weather, effect } = getCurrentTimeAndWeather();
        let weatherBonus = 1.0;
        if (effect.type === 'gathering' && effect.target === actionName) {
            weatherBonus = effect.value;
        }

        // Global Boost
        let globalMulti = 1.0;
        try {
            const GlobalState = require('../models/GlobalState');
            const global = await GlobalState.findOne({ key: 'main' });
            if (global && global.boosts.gathering > 1) {
                const isExpired = global.boosts.gathering_expires && new Date() > global.boosts.gathering_expires;
                if (!isExpired) {
                    globalMulti = global.boosts.gathering;
                }
            }
        } catch (e) {}

        // 5. Roll for Rewards
        let totalItems = 0;
        let rewardMessage = `${actionEmoji} You begin ${actionName}ing in **${subRegionData.name}**...`;
        const efficiencyMulti = (tool?.efficiency || 1.0) * weatherBonus * globalMulti;
        const potentialRewards = subRegionData.resources[resourceType];

        for (const res of potentialRewards) {
            if (Math.random() <= (res.chance * (toolType === 'rod' ? efficiencyMulti : 1.0))) {
                let quantity = Math.floor((Math.random() * (res.max - res.min + 1) + res.min) * (toolType !== 'rod' ? efficiencyMulti : 1.0));
                
                if (quantity > 0) {
                    user.addItem(res.item, quantity);
                    totalItems += quantity;
                    await updateQuestProgress(user.userId, actionName, res.item, quantity);
                    const displayName = res.item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    rewardMessage += `\n+ **${quantity}x ${displayName}**`;
                }
            }
        }

        if (totalItems === 0) rewardMessage += `\n...but you found nothing of value.`;

        // 6. Durability & XP
        if (tool) {
            const durabilityCost = totalItems > 0 ? (totalItems * (toolType === 'rod' ? 5 : 2)) : 1;
            const { currentDurability, toolBroke } = reduceToolDurability(user, tool, durabilityCost);
            if (toolBroke) {
                rewardMessage += `\n\n💥 **CRACK!** Your **${tool.name}** shattered from the effort!`;
            } else {
                rewardMessage += `\n\n🛡️ Durability: ${currentDurability}/${tool.maxDurability}`;
            }
        }

        user.cooldowns.set(actionName, now);
        const { xpAmount, summary } = await addActivityXp(user, actionName);

        rewardMessage += `\n*+${xpAmount} XP*`;
        if (weatherBonus > 1.0) rewardMessage += `\n✨ **Weather Bonus Applied!** (${weather})`;

        await user.save();

        const embed = new EmbedBuilder()
            .setTitle(`${actionEmoji} ${actionName.charAt(0).toUpperCase() + actionName.slice(1)} Results`)
            .setDescription(rewardMessage)
            .setColor(color);

        const embeds = [embed];

        if (summary.playerLevelsGained > 0 || summary.classLevelsGained > 0) {
            const LevelUpVisuals = require('./LevelUpVisuals');
            embeds.push(LevelUpVisuals.createLevelUpEmbed(user, summary));
        }

        return interaction.editReply({ embeds });
    }
}

module.exports = GatheringManager;