const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require('discord.js');
const User = require('../models/User');
const Auction = require('../models/Auction');
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const { findItem } = require('../utils/itemUtils');

const AUCTION_DURATION_HOURS = 48; // 2 days
const TAX_RATE = 0.05; // 5% Tax

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('Trade items with other players')
        .addSubcommand(sub => 
            sub.setName('list')
                .setDescription('View and buy active auctions')
                .addStringOption(opt => opt.setName('item').setDescription('Filter by item name (optional)').setAutocomplete(true))
        )
        .addSubcommand(sub =>
            sub.setName('sell')
                .setDescription('List an item for sale (Leave empty for GUI)')
                .addStringOption(opt => opt.setName('item').setDescription('Item Name or ID').setAutocomplete(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity to sell'))
                .addIntegerOption(opt => opt.setName('price').setDescription('Total price'))
        )
        .addSubcommand(sub =>
            sub.setName('buy')
                .setDescription('Buy an item by Auction ID')
                .addStringOption(opt => opt.setName('id').setDescription('The ID of the auction').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(sub =>
            sub.setName('my')
                .setDescription('View your active listings')
        )
        .addSubcommand(sub =>
            sub.setName('cancel')
                .setDescription('Reclaim items from your own active auction.')
                .addStringOption(opt => opt.setName('id').setDescription('The ID of your auction').setRequired(true).setAutocomplete(true))
        ),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const sub = interaction.options.getSubcommand();
        const focusedValue = focusedOption.value.toLowerCase();

        if (sub === 'sell' && focusedOption.name === 'item') {
            const user = await User.findOne({ userId: interaction.user.id }).select('inventory').lean();
            if (!user || !user.inventory) return interaction.respond([]);

            const choices = [];
            const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);

            for (const [itemId, qty] of inventoryEntries) {
                const item = MASTER_ITEM_MAP[itemId];
                if (item && item.auctionable !== false) {
                    if (item.name.toLowerCase().includes(focusedValue) || itemId.toLowerCase().includes(focusedValue)) {
                        choices.push({ name: `${item.name} (x${qty})`, value: itemId });
                    }
                }
            }
            return interaction.respond(choices.slice(0, 25));
        }

        if (sub === 'list' && focusedOption.name === 'item') {
            const activeAuctions = await Auction.find({ expiresAt: { $gt: new Date() } }).distinct('itemKey');
            const choices = activeAuctions
                .map(key => {
                    const item = MASTER_ITEM_MAP[key];
                    return { name: item ? item.name : key.replace(/_/g, ' ').toUpperCase(), value: key };
                })
                .filter(choice => choice.name.toLowerCase().includes(focusedValue))
                .slice(0, 25);
            
            return interaction.respond(choices);
        }

        if (sub === 'buy' && focusedOption.name === 'id') {
            const activeAuctions = await Auction.find({ 
                expiresAt: { $gt: new Date() },
                sellerId: { $ne: interaction.user.id }
            }).sort({ listedAt: -1 }).limit(25).lean();

            const choices = activeAuctions
                .map(a => {
                    const label = `${a.amount}x ${a.itemName} - ${a.price}g [${a.sellerName}]`;
                    return { name: label.length > 100 ? label.substring(0, 97) + '...' : label, value: a._id.toString() };
                })
                .filter(choice => choice.name.toLowerCase().includes(focusedValue))
                .slice(0, 25);

            return interaction.respond(choices);
        }

        if (sub === 'cancel' && focusedOption.name === 'id') {
            const myAuctions = await Auction.find({ sellerId: interaction.user.id }).sort({ listedAt: -1 }).lean();
            const choices = myAuctions
                .map(a => {
                    const label = `${a.amount}x ${a.itemName} [${a._id.toString().slice(-6)}]`;
                    return { name: label, value: a._id.toString() };
                })
                .filter(choice => choice.name.toLowerCase().includes(focusedValue))
                .slice(0, 25);
            
            return interaction.respond(choices);
        }
    },

    async handleSelectMenu(interaction, action, args) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.reply({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });

        if (action === 'sell') {
            const itemKey = interaction.values[0];
            await showSellModal(interaction, itemKey);
        } 
        else if (action === 'buy') {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const auctionId = interaction.values[0];
            await handleBuyLogic(interaction, user, auctionId);
        }
    },

    async handleModal(interaction, action, args) {
        if (action === 'sellModal') {
            const itemKey = args[0];
            const user = await User.findOne({ userId: interaction.user.id });
            const amount = parseInt(interaction.fields.getTextInputValue('amountInput'));
            const price = parseInt(interaction.fields.getTextInputValue('priceInput'));

            if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            await processSell(interaction, user, itemKey, amount, price);
        }
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        
        // Modal shows immediately, no defer
        if (sub === 'sell' && !interaction.options.getString('item')) {
            const user = await User.findOne({ userId: interaction.user.id });
            if (!user) return interaction.reply({ content: 'Use `/start` first!', flags: [MessageFlags.Ephemeral] });
            return await handleSellCommandGUI(interaction, user);
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('Use `/start` first!');

        if (sub === 'sell') {
            await handleSellCommand(interaction, user);
        } else if (sub === 'list') {
            await handleListCommand(interaction);
        } else if (sub === 'buy') {
            await handleBuyLogic(interaction, user, interaction.options.getString('id'));
        } else if (sub === 'my') {
            await handleMyListings(interaction, user);
        } else if (sub === 'cancel') {
            await handleCancelAuction(interaction, user, interaction.options.getString('id'));
        }
    }
};

// --- LOGIC FUNCTIONS ---

async function handleCancelAuction(interaction, user, auctionId) {
    if (!auctionId.match(/^[0-9a-fA-F]{24}$/)) {
        return interaction.editReply('❌ Invalid Auction ID.');
    }

    const auction = await Auction.findById(auctionId);

    if (!auction) return interaction.editReply('❌ This auction no longer exists.');
    if (auction.sellerId !== user.userId) return interaction.editReply('❌ This is not your auction!');

    // Check bank capacity
    const bankInv = user.bank.inventory;
    const bankUnique = user.bank.uniqueInventory;
    const currentSlots = (bankInv instanceof Map ? bankInv.size : Object.keys(bankInv).length) + (bankUnique?.length || 0);
    const alreadyInBank = user.bank.inventory.has(auction.itemKey);

    if (!alreadyInBank && currentSlots >= user.bank.capacity) {
        return interaction.editReply('❌ Your vault is full! Reclaiming these items would exceed your storage capacity.');
    }

    user.addBankItem(auction.itemKey, auction.amount);
    await user.save();

    await Auction.deleteOne({ _id: auction._id });

    const embed = new EmbedBuilder()
        .setTitle('⚖️ Auction Cancelled')
        .setDescription(`Successfully reclaimed **${auction.amount}x ${auction.itemName}** to your **Bank Vault**. \n*Listing tax is non-refundable.*`)
        .setColor('#e74c3c');

    await interaction.editReply({ embeds: [embed] });
}

async function handleSellCommandGUI(interaction, user) {
    const inventoryItems = Array.from(user.inventory.keys());
    if (inventoryItems.length === 0) {
        return interaction.reply({ content: '🎒 Your inventory is empty.', flags: [MessageFlags.Ephemeral] });
    }

    const options = inventoryItems.slice(0, 25).map(key => {
        const qty = user.inventory.get(key);
        const name = key.replace(/_/g, ' ').toUpperCase();
        return {
            label: name + ' (x' + qty + ')',
            value: key,
            description: 'Click to sell this item'
        };
    });

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('auction:sell')
            .setPlaceholder('Select an item to sell...')
            .addOptions(options)
    );

    await interaction.reply({
        content: '📦 **Sell Item:** Select an item from your inventory.',
        components: [row],
        flags: [MessageFlags.Ephemeral]
    });
}

async function handleSellCommand(interaction, user) {
    const itemKey = interaction.options.getString('item');
    const amount = interaction.options.getInteger('amount');
    const price = interaction.options.getInteger('price');

    if (itemKey && amount && price) {
        const foundItem = findItem(itemKey);
        if (!foundItem) return interaction.editReply(`❌ Item \`${itemKey}\` not found.`);
        return processSell(interaction, user, foundItem.id, amount, price);
    }
    return interaction.editReply("❌ Please provide item, amount, and price.");
}

async function showSellModal(interaction, itemKey) {
    const modal = new ModalBuilder()
        .setCustomId(`auction:sellModal:${itemKey}`)
        .setTitle('Sell ' + itemKey.replace(/_/g, ' ').toUpperCase());

    const amountInput = new TextInputBuilder()
        .setCustomId('amountInput')
        .setLabel('Quantity')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('How many?')
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('priceInput')
        .setLabel('Total Price (Gold)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 100')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(priceInput)
    );

    await interaction.showModal(modal);
}

async function processSell(interaction, user, itemKey, amount, price) {
    if (isNaN(amount) || amount <= 0) return interaction.editReply('❌ Invalid amount.');
    if (isNaN(price) || price <= 0) return interaction.editReply('❌ Invalid price.');

    const inventoryQuantity = user.inventory.get(itemKey) || 0;
    if (inventoryQuantity < amount) {
        return interaction.editReply('❌ You only have **' + inventoryQuantity + 'x ' + itemKey + '**.');
    }

    const tax = Math.floor(price * TAX_RATE);
    if (user.gold < tax) {
        return interaction.editReply('❌ You need **' + tax + ' gold** to pay the listing tax.');
    }

    const itemData = MASTER_ITEM_MAP[itemKey];
    if (itemData && itemData.auctionable === false) {
        return interaction.editReply(`❌ **${itemData.name}** cannot be auctioned.`);
    }

    // Check if it's a locked unique item (instanceId might be passed as itemKey in some contexts, but usually unique items aren't stackable in standard inventory)
    // However, the current auction system seems to only handle stackable items via itemKey.
    // If you ever allow unique items in auction, you'd check relic.isLocked or uniqueItem.isLocked here.
    // For now, standard inventory doesn't have locks.

    user.removeItem(itemKey, amount);
    user.gold -= tax;
    await user.save();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + AUCTION_DURATION_HOURS);

    const auction = new Auction({
        sellerId: user.userId,
        sellerName: user.username || interaction.user.username,
        itemKey: itemKey,
        itemName: itemKey.replace(/_/g, ' ').toUpperCase(),
        amount: amount,
        price: price,
        expiresAt: expiresAt
    });

    await auction.save();

    const embed = new EmbedBuilder()
        .setTitle('⚖️ Auction Listed')
        .setDescription('Listed **' + amount + 'x ' + auction.itemName + '** for **' + price + 'g**.\nTax Paid: ' + tax + 'g')
        .setColor('#FFFF00');

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleListCommand(interaction) {
    const filterItem = interaction.options.getString('item');
    const query = { expiresAt: { $gt: new Date() } };
    
    if (filterItem) {
        query.itemKey = { $regex: filterItem.toLowerCase() };
    }

    const auctions = await Auction.find(query).sort({ listedAt: -1 }).limit(20);

    if (auctions.length === 0) {
        return interaction.editReply('📭 No active auctions found.');
    }

    const embed = new EmbedBuilder()
        .setTitle('🏛️ Auction House')
        .setColor('#FFFFFF')
        .setDescription('Select an item from the dropdown below to **Instant Buy**.');

    let listText = '';
    auctions.slice(0, 10).forEach(a => {
        const timeRemaining = `<t:${Math.floor(a.expiresAt.getTime() / 1000)}:R>`;
        listText += `**${a.amount}x ${a.itemName}** | 💰 ${a.price}g | ⏳ ${timeRemaining} | Seller: ${a.sellerName}\n`;
    });
    if (auctions.length > 10) listText += '...and ' + (auctions.length - 10) + ' more in dropdown.';
    
    embed.addFields({ name: 'Recent Listings', value: listText || 'None' });

    const options = auctions.map(a => ({
        label: a.amount + 'x ' + a.itemName + ' (' + a.price + 'g)',
        description: 'Seller: ' + a.sellerName,
        value: a._id.toString()
    }));

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('auction:buy')
            .setPlaceholder('🛒 Select an item to buy...')
            .addOptions(options)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleBuyLogic(interaction, buyer, auctionId) {
    if (!auctionId.match(/^[0-9a-fA-F]{24}$/)) {
        return interaction.editReply('❌ Invalid Auction ID.');
    }

    const auction = await Auction.findById(auctionId);

    if (!auction) return interaction.editReply('❌ This auction no longer exists.');
    if (auction.sellerId === buyer.userId) return interaction.editReply('❌ You cannot buy your own auction.');
    if (buyer.gold < auction.price) return interaction.editReply('❌ You need **' + auction.price + 'g** on hand to buy this.');

    // Check buyer's bank capacity for the item
    const bankInv = buyer.bank.inventory;
    const bankUnique = buyer.bank.uniqueInventory;
    const currentSlots = (bankInv instanceof Map ? bankInv.size : Object.keys(bankInv).length) + (bankUnique?.length || 0);
    const alreadyInBank = buyer.bank.inventory.has(auction.itemKey);

    if (!alreadyInBank && currentSlots >= buyer.bank.capacity) {
        return interaction.editReply('❌ Your bank vault is full! Make space before buying more items.');
    }

    buyer.gold -= auction.price;
    buyer.addBankItem(auction.itemKey, auction.amount);
    await buyer.save();

    const seller = await User.findOne({ userId: auction.sellerId });
    if (seller) {
        seller.bank.gold += auction.price;
        await seller.save();
    }

    await Auction.deleteOne({ _id: auction._id });

    const embed = new EmbedBuilder()
        .setTitle('🤝 Purchase Successful!')
        .setDescription(`Bought **${auction.amount}x ${auction.itemName}** for **${auction.price}g**.\n\n📦 The items have been sent to your **Bank Vault**.\n💰 The seller received the gold in their **Bank Vault**.`)
        .setColor('#00FF00');

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleMyListings(interaction, user) {
    const auctions = await Auction.find({ sellerId: user.userId });

    if (auctions.length === 0) return interaction.editReply('You have no active listings.');

    const embed = new EmbedBuilder()
        .setTitle('📦 Your Listings')
        .setColor('#FFA500');

    let description = '';
    auctions.forEach(a => {
        const timeRemaining = `<t:${Math.floor(a.expiresAt.getTime() / 1000)}:R>`;
        description += '**ID:** `' + a._id + '` | **' + a.amount + 'x ' + a.itemName + '** | ' + a.price + 'g | ⏳ ' + timeRemaining + '\n';
    });
    
    embed.setDescription(description);
    await interaction.editReply({ embeds: [embed] });
}