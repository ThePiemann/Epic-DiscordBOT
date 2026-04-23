const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems'); // Ensure this path is correct

// Helper function to find an item's data by its ID
const getItemData = (itemId) => MASTER_ITEM_MAP[itemId];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unequip')
        .setDescription('Remove an item from an equipment slot and place it in your inventory.')
        .addStringOption(option =>
            option.setName('slot')
                .setDescription('The equipment slot to unequip (e.g., weapon, chest)')
                .setRequired(true)
                .addChoices(
                    { name: 'Weapon', value: 'weapon' },
                    { name: 'Head', value: 'head' },
                    { name: 'Chest', value: 'chest' }
                    // Add more slots as you implement them
                )),
    
    async execute(interaction) {
        // Defer the reply to avoid "Unknown interaction" errors
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
            return interaction.editReply('Use `/start` to create a character first!');
        }

        const slot = interaction.options.getString('slot').toLowerCase();

        // 1. Check if an item is equipped in the specified slot
        const equippedId = user.equipment.get(slot);

        if (!equippedId) {
            return interaction.editReply(`❌ Nothing is currently equipped in the **${slot.toUpperCase()}** slot.`);
        }

        // 2. Check if it's a unique item
        const uniqueItem = user.uniqueInventory.find(i => i.instanceId === equippedId);
        let itemName = equippedId;

        if (uniqueItem) {
            uniqueItem.isEquipped = false;
            itemName = uniqueItem.name;
        } else {
            // Was stackable, add back to inventory
            const itemData = getItemData(equippedId);
            user.addItem(equippedId, 1); 
            itemName = itemData ? itemData.name : equippedId;
        }

        // 3. Clear the equipment slot
        user.equipment.delete(slot); 

        await user.save();

        return interaction.editReply(`✅ Successfully unequipped **${itemName}** from the **${slot.toUpperCase()}** slot and placed it back in your inventory.`);
    }
};