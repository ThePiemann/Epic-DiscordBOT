const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

const TUTORIAL_STEPS = [
    {
        title: 'Step 1: Check Your Profile',
        description: `Welcome to Everlasting Journey! Every adventurer should know their own status.

📝 **Task:** Use the \`/profile\` command to see your character overview.`,
        reward: '10 Gold'
    },
    {
        title: 'Step 2: Combat Stats',
        description: `Your profile is just the beginning. Let's look at your detailed attributes like Attack and Defense.

📝 **Task:** Use the \`/stats\` command to see your detailed combat stats.`,
        reward: '1 Small Potion'
    },
    {
        title: 'Step 3: Exploration',
        description: `The world is vast! You are currently in the Gentle Meads. Let's see what's nearby.

📝 **Task:** Use the \`/explore\` command to spot local points of interest.`,
        reward: '100 Exp'
    },
    {
        title: 'Step 4: Your First Battle',
        description: `To grow stronger, you must face enemies. Go to the wilderness or a dungeon to find trouble.

📝 **Task:** Use the \`/fight\` command to engage a random enemy.`,
        reward: '50 Gold'
    },
    {
        title: 'Step 5: Visiting the Shop',
        description: `Towns like **Oakhaven** offer essential services. Let's browse the local wares.

📝 **Task:** Enter a town and use \`/shop view\` to see the inventory.`,
        reward: '25 Gold'
    },
    {
        title: 'Step 6: Buying an Item',
        description: `Knowing what's for sale is good, but owning it is better. Let's buy something!

📝 **Task:** Use \`/shop buy small_potion\` to purchase a health potion.`,
        reward: '1 Wooden Pickaxe'
    },
    {
        title: 'Step 7: Checking Your Pack',
        description: `You've acquired some items! Let's see what's in your bag. Tools like pickaxes work automatically from your inventory.

📝 **Task:** Use the \`/inventory\` command to view your items.`,
        reward: '1 Wooden Axe'
    },
    {
        title: 'Step 8: Mining Resources',
        description: `With a pickaxe in your bag, you can gather valuable ores from rocky areas.

📝 **Task:** Go to a rocky place (like the wilderness) and use the \`/mine\` command.`,
        reward: '2 Small Potions'
    },
    {
        title: 'Step 9: Woodchopping',
        description: `Forests provide wood, an essential material for crafting. An axe in your bag is all you need!

📝 **Task:** Use the \`/chop\` command in a wooded area.`,
        reward: '100 Exp'
    },
    {
        title: 'Step 10: Selling Loot',
        description: `Finally, you can sell your gathered resources or unwanted loot for a profit.

📝 **Task:** Return to a town and use the \`/sell\` command to sell an item.`,
        reward: '100 Gold & Final Completion Bonus'
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tutorial')
        .setDescription('Get guidance on how to play and earn rewards.'),
    TUTORIAL_STEPS,

    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });

        let stepIndex = user.tutorialStep || 0;
        
        if (stepIndex >= TUTORIAL_STEPS.length) {
            return interaction.reply({ content: '🎉 You have already completed the tutorial!', flags: [MessageFlags.Ephemeral] });
        }

        const step = TUTORIAL_STEPS[stepIndex];

        const embed = new EmbedBuilder()
            .setTitle(`📖 Tutorial: ${step.title}`)
            .setDescription(step.description)
            .addFields({ name: '🎁 Reward for completion', value: step.reward })
            .setColor('#3498db')
            .setFooter({ text: `Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}` });

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};