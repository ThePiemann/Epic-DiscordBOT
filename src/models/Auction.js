const mongoose = require('mongoose');

const AuctionSchema = new mongoose.Schema({
    sellerId: { type: String, required: true }, // Discord User ID
    sellerName: { type: String, required: true }, // For display purposes
    
    itemKey: { type: String, required: true }, // e.g., 'stone', 'iron_sword'
    itemName: { type: String, required: true }, // e.g., 'Stone', 'Iron Sword'
    amount: { type: Number, required: true, default: 1 },
    
    price: { type: Number, required: true }, // Total price for the stack
    
    listedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true } // Auto-clean up later
});

module.exports = mongoose.model('Auction', AuctionSchema);