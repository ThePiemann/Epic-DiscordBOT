const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');
const SHOP_ITEMS = require('../data/shopItems'); // Used to get pretty names for items

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gift')
        .setDescription('Give gifts to other players.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('gold')
                .setDescription('Give gold to another player.')
                .addUserOption(option => 
                    option.setName('target')
                        .setDescription('The player to give gold to')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('amount')
                        .setDescription('Amount of gold to give')
                        .setMinValue(1)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('item')
                .setDescription('Give an item to another player.')
                .addUserOption(option => 
                    option.setName('target')
                        .setDescription('The player to give the item to')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('item_id')
                        .setDescription('The ID of the item (e.g., small_potion)')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('amount')
                        .setDescription('Amount of items to give')
                        .setMinValue(1)
                        .setRequired(false)) // Default to 1 if not specified
        ),

    async execute(interaction) {
        // We defer purely to give the database time to process two user documents
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('target');
        
        // 1. Safety Checks: Self-Gifting
        if (targetUser.id === interaction.user.id) {
            return interaction.editReply("❌ You cannot give gifts to yourself.");
        }

        // 2. Safety Checks: Bot Gifting
        if (targetUser.bot) {
            return interaction.editReply("❌ You cannot give gifts to bots.");
        }

        try {
            // 3. Fetch Data: Get both Sender and Receiver from DB
            // We use Promise.all to fetch them in parallel for speed
            const [sender, receiver] = await Promise.all([
                User.findOne({ userId: interaction.user.id }),
                User.findOne({ userId: targetUser.id })
            ]);

            // 4. Validation: Check if profiles exist
            if (!sender) {
                return interaction.editReply("❌ You don't have a character yet. Use `/start` to begin!");
            }
            if (!receiver) {
                return interaction.editReply(`❌ **${targetUser.username}** doesn't have a character yet.`);
            }

            // --- GOLD TRANSFER LOGIC ---
            if (subcommand === 'gold') {
                const amount = interaction.options.getInteger('amount');

                if (sender.gold < amount) {
                    return interaction.editReply(`❌ Transaction failed. You only have **${sender.gold}** Gold.`);
                }

                // Transfer Logic
                sender.gold -= amount;
                receiver.gold += amount;

                // Save both documents
                await Promise.all([sender.save(), receiver.save()]);

                return interaction.editReply(`✅ **${interaction.user.username}** gave **${amount} Gold** 🪙 to **${targetUser.username}**!`);
            }

            // --- ITEM TRANSFER LOGIC ---
            if (subcommand === 'item') {
                const rawItemId = interaction.options.getString('item_id').toLowerCase();
                const amount = interaction.options.getInteger('amount') || 1;

                // Check Sender's Inventory using the Map
                const senderItemCount = sender.inventory.get(rawItemId) || 0;

                if (senderItemCount < amount) {
                    return interaction.editReply(`❌ You don't have enough **${rawItemId}**. You only have: **${senderItemCount}**.`);
                }

                // Retrieve Item Name for pretty display (Optional)
                const itemData = SHOP_ITEMS.find(i => i.id === rawItemId);
                const itemName = itemData ? itemData.name : rawItemId;

                // Transfer Logic: Remove from Sender
                const newSenderAmount = senderItemCount - amount;
                if (newSenderAmount > 0) {
                    sender.inventory.set(rawItemId, newSenderAmount);
                } else {
                    sender.inventory.delete(rawItemId); // Remove key if 0 to keep DB clean
                }

                // Transfer Logic: Add to Receiver (using the helper method from User.js)
                receiver.addItem(rawItemId, amount);

                // Save both documents
                await Promise.all([sender.save(), receiver.save()]);

                return interaction.editReply(`✅ **${interaction.user.username}** gave **${amount}x ${itemName}** 🎁 to **${targetUser.username}**!`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply("❌ An internal error occurred while processing the transaction.");
        }
    }
};