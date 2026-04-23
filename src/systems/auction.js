const mongoose = require('mongoose');
const Auction = require('../models/Auction');
const User = require('../models/User');
const { EmbedBuilder } = require('discord.js');

/**
 * Checks for expired auctions and refunds items to the seller's mailbox.
 * @param {import('discord.js').Client} client - Discord client for DM notifications.
 */
async function processExpiredAuctions(client) {
    if (mongoose.connection.readyState !== 1) return;

    try {
        const now = new Date();
        const expiredAuctions = await Auction.find({
            expiresAt: { $lte: now }
        });

        if (expiredAuctions.length === 0) return;

        console.log(`[Auction] Processing ${expiredAuctions.length} expired auctions...`);

        for (const auction of expiredAuctions) {
            const user = await User.findOne({ userId: auction.sellerId });
            
            if (user) {
                // Check bank capacity
                const bankInv = user.bank.inventory;
                const bankUnique = user.bank.uniqueInventory;
                const currentSlots = (bankInv instanceof Map ? bankInv.size : Object.keys(bankInv).length) + (bankUnique?.length || 0);
                const alreadyInBank = user.bank.inventory.has(auction.itemKey);

                let location = 'Bank Vault';
                if (!alreadyInBank && currentSlots >= user.bank.capacity) {
                    // Bank Full -> Refund to mailbox
                    location = 'Mail Inbox (Bank was full)';
                    user.mailbox.push({
                        sender: 'Auction House',
                        content: `Your auction for **${auction.amount}x ${auction.itemName}** has expired. Your bank was full, so the items have been returned here.`,
                        attachments: [{ id: auction.itemKey, amount: auction.amount }],
                        gold: 0,
                        date: new Date()
                    });
                } else {
                    // Bank has space -> Send to bank
                    user.addBankItem(auction.itemKey, auction.amount);
                }
                
                await user.save();

                // Notify via DM if possible
                try {
                    const discordUser = await client.users.fetch(user.userId);
                    if (discordUser) {
                        const notifyEmbed = new EmbedBuilder()
                            .setTitle('⚖️ Auction Expired')
                            .setDescription(`Your auction for **${auction.amount}x ${auction.itemName}** has expired.`)
                            .addFields({ name: 'Action', value: `Items have been returned to your **${location}**.` })
                            .setColor('#e74c3c')
                            .setTimestamp();

                        await discordUser.send({ embeds: [notifyEmbed] });
                    }
                } catch (dmError) {
                    // Ignore DM errors (DMs closed)
                }
            }

            // Delete the expired auction
            await Auction.deleteOne({ _id: auction._id });
        }
    } catch (error) {
        console.error('[Auction] Expired Auction Processing Error:', error);
    }
}

module.exports = { processExpiredAuctions };