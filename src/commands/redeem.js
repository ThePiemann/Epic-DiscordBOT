const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');
const codes = require('../data/codes');
const SHOP_ITEMS = require('../data/shopItems'); // Used to get item names

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem a code for rewards.')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to redeem')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const inputCode = interaction.options.getString('code').toUpperCase().trim();
        const user = await User.findOne({ userId: interaction.user.id });

        if (!user) {
            return interaction.editReply("❌ You need to create a character first with `/start`.");
        }

        // 1. Check if the code exists in our config file
        const reward = codes[inputCode];

        if (!reward) {
            return interaction.editReply(`❌ The code \`${inputCode}\` is invalid or expired.`);
        }

        // 2. Check if the user has already used this code
        if (user.redeemedCodes.includes(inputCode)) {
            return interaction.editReply(`❌ You have already redeemed the code \`${inputCode}\`.`);
        }

        // 3. Apply the Reward
        let rewardMessage = "";

        try {
            switch (reward.type) {
                case 'gold':
                    user.gold += reward.amount;
                    rewardMessage = `**${reward.amount} Gold** 🪙`;
                    break;

                case 'xp':
                    user.exp += reward.amount;
                    rewardMessage = `**${reward.amount} XP** ✨`;
                    break;

                case 'item':
                    const itemId = reward.itemId;
                    const amount = reward.amount || 1;
                    
                    // Add item using the User model helper
                    user.addItem(itemId, amount);
                    
                    // Try to find the pretty name of the item
                    const itemData = SHOP_ITEMS.find(i => i.id === itemId);
                    const itemName = itemData ? itemData.name : itemId;
                    
                    rewardMessage = `**${amount}x ${itemName}** 🎁`;
                    break;

                default:
                    return interaction.editReply("❌ This code has an invalid reward type. Please contact an admin.");
            }

            // 4. Mark code as redeemed and save
            user.redeemedCodes.push(inputCode);
            await user.save();

            return interaction.editReply(`✅ **Code Redeemed!**\nYou received: ${rewardMessage}`);

        } catch (error) {
            console.error(error);
            return interaction.editReply("❌ An error occurred while redeeming your code.");
        }
    }
};