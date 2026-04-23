const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const Trade = require('../models/Trade');
const { MASTER_ITEM_MAP } = require('../data/shopItems');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade items and gold with another player.')
        .addSubcommand(sub => 
            sub.setName('start')
                .setDescription('Start a trade with someone.')
                .addUserOption(opt => opt.setName('user').setDescription('The user to trade with').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('add-item')
                .setDescription('Add an item to the trade.')
                .addStringOption(opt => opt.setName('item_id').setDescription('Item ID').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('add-gold')
                .setDescription('Add gold to the trade.')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of gold').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('view').setDescription('View current trade status.'))
        .addSubcommand(sub => sub.setName('confirm').setDescription('Confirm the trade.'))
        .addSubcommand(sub => sub.setName('cancel').setDescription('Cancel the trade.')),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        const user = await User.findOne({ userId });
        if (!user) return interaction.editReply('Use `/start` first!');

        // --- START TRADE ---
        if (subcommand === 'start') {
            const targetUser = interaction.options.getUser('user');
            if (targetUser.id === userId) return interaction.editReply("You can't trade with yourself!");
            if (targetUser.bot) return interaction.editReply("You can't trade with bots.");

            const partner = await User.findOne({ userId: targetUser.id });
            if (!partner) return interaction.editReply(`${targetUser.username} hasn't started the game yet.`);

            // Check if already in trade
            const existing = await Trade.findOne({ $or: [{ initiatorId: userId }, { targetId: userId }] });
            if (existing) return interaction.editReply("You are already in a trade! Finish or cancel it first.");

            const partnerExisting = await Trade.findOne({ $or: [{ initiatorId: targetUser.id }, { targetId: targetUser.id }] });
            if (partnerExisting) return interaction.editReply(`${targetUser.username} is already in a trade.`);

            const trade = new Trade({
                initiatorId: userId,
                targetId: targetUser.id
            });
            await trade.save();

            return interaction.editReply(`🤝 Trade started with **${targetUser.username}**! Use 	/trade add-item	 or 	/trade add-gold	 to offer things.`);
        }

        // --- FETCH ACTIVE TRADE ---
        const trade = await Trade.findOne({ $or: [{ initiatorId: userId }, { targetId: userId }] });
        if (!trade) return interaction.editReply("You are not in an active trade.");

        const isInitiator = trade.initiatorId === userId;
        const role = isInitiator ? 'initiator' : 'target';
        const partnerId = isInitiator ? trade.targetId : trade.initiatorId;

        // --- CANCEL ---
        if (subcommand === 'cancel') {
            await Trade.deleteOne({ _id: trade._id });
            return interaction.editReply("🛑 Trade cancelled.");
        }

        // --- ADD ITEM ---
        if (subcommand === 'add-item') {
            const itemId = interaction.options.getString('item_id').toLowerCase();
            const amount = interaction.options.getInteger('amount');

            if (amount <= 0) return interaction.editReply("Amount must be positive.");

            // Check ownership
            const currentQty = user.inventory.get(itemId) || 0;
            if (currentQty < amount) return interaction.editReply(`❌ You don't have ${amount}x ${itemId}.`);

            // Check Validity
            const itemData = MASTER_ITEM_MAP[itemId];
            if (!itemData) return interaction.editReply("❌ Invalid item ID.");
            if (itemData.tradeable === false) return interaction.editReply(`❌ **${itemData.name}** cannot be traded.`);

            // Reset confirmation on change
            trade.initiatorConfirmed = false;
            trade.targetConfirmed = false;

            // Update offer
            const offer = isInitiator ? trade.initiatorOffer : trade.targetOffer;
            const currentOfferQty = offer.items.get(itemId) || 0;
            
            // Check if total offer exceeds inventory
            if ((currentOfferQty + amount) > currentQty) {
                return interaction.editReply(`❌ You only have ${currentQty}x ${itemId} (already offered ${currentOfferQty}).`);
            }

            offer.items.set(itemId, currentOfferQty + amount);
            await trade.save();

            return interaction.editReply(`📦 Added **${amount}x ${itemData.name}** to the trade.`);
        }

        // --- ADD GOLD ---
        if (subcommand === 'add-gold') {
            const amount = interaction.options.getInteger('amount');
            if (amount <= 0) return interaction.editReply("Amount must be positive.");

            if (user.gold < amount) return interaction.editReply(`❌ You don't have ${amount} gold.`);

            // Reset confirmation
            trade.initiatorConfirmed = false;
            trade.targetConfirmed = false;

            const offer = isInitiator ? trade.initiatorOffer : trade.targetOffer;
            
            if ((offer.gold + amount) > user.gold) {
                return interaction.editReply(`❌ You only have ${user.gold}g (already offered ${offer.gold}g).`);
            }

            offer.gold += amount;
            await trade.save();

            return interaction.editReply(`💰 Added **${amount}g** to the trade.`);
        }

        // --- VIEW ---
        if (subcommand === 'view') {
            return displayTradeStatus(interaction, trade, userId);
        }

        // --- CONFIRM ---
        if (subcommand === 'confirm') {
            if (isInitiator) trade.initiatorConfirmed = true;
            else trade.targetConfirmed = true;

            await trade.save();

            if (trade.initiatorConfirmed && trade.targetConfirmed) {
                await finalizeTrade(interaction, trade);
            } else {
                await displayTradeStatus(interaction, trade, userId, "✅ You confirmed! Waiting for partner...");
            }
        }
    }
};

async function displayTradeStatus(interaction, trade, viewerId, extraMsg = "") {
    const initiator = await User.findOne({ userId: trade.initiatorId });
    const target = await User.findOne({ userId: trade.targetId });

    const formatOffer = (offer) => {
        let text = `💰 **${offer.gold}g**
`;
        if (offer.items && offer.items.size > 0) {
            for (const [itemId, qty] of offer.items.entries()) {
                const itemData = MASTER_ITEM_MAP[itemId];
                const name = itemData ? itemData.name : itemId;
                text += `📦 ${qty}x ${name}
`;
            }
        } else {
            text += "*(No items)*";
        }
        return text;
    };

    const embed = new EmbedBuilder()
        .setTitle('🤝 Active Trade')
        .setDescription(extraMsg || 'Review offers and use `/trade confirm` when ready.')
        .setColor('#FFFF00')
        .addFields(
            { 
                name: `${trade.initiatorConfirmed ? '✅' : '⏳'} ${initiator.username}'s Offer`,
                value: formatOffer(trade.initiatorOffer), 
                inline: true 
            },
            { 
                name: `${trade.targetConfirmed ? '✅' : '⏳'} ${target.username}'s Offer`,
                value: formatOffer(trade.targetOffer), 
                inline: true 
            }
        );

    await interaction.editReply({ embeds: [embed] });
}

async function finalizeTrade(interaction, trade) {
    const initiator = await User.findOne({ userId: trade.initiatorId });
    const target = await User.findOne({ userId: trade.targetId });

    // Final Validation (Double Check resources)
    const validate = (user, offer) => {
        if (user.gold < offer.gold) return false;
        if (offer.items) {
            for (const [id, qty] of offer.items.entries()) {
                if ((user.inventory.get(id) || 0) < qty) return false;
            }
        }
        return true;
    };

    if (!validate(initiator, trade.initiatorOffer) || !validate(target, trade.targetOffer)) {
        await Trade.deleteOne({ _id: trade._id });
        return interaction.editReply("❌ Trade failed! One party no longer has the items/gold.");
    }

    // Transfer
    const transfer = (fromUser, toUser, offer) => {
        fromUser.gold -= offer.gold;
        toUser.gold += offer.gold;
        if (offer.items) {
            for (const [id, qty] of offer.items.entries()) {
                fromUser.removeItem(id, qty);
                toUser.addItem(id, qty);
            }
        }
    };

    transfer(initiator, target, trade.initiatorOffer);
    transfer(target, initiator, trade.targetOffer);

    await initiator.save();
    await target.save();
    await Trade.deleteOne({ _id: trade._id });

    const embed = new EmbedBuilder()
        .setTitle('✅ Trade Complete!')
        .setDescription(`Transaction between **${initiator.username}** and **${target.username}** finalized.`)
        .setColor('#00FF00');

    await interaction.editReply({ embeds: [embed] });
}
