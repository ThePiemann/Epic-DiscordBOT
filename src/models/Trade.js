const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
    initiatorId: { type: String, required: true },
    targetId: { type: String, required: true },
    
    initiatorOffer: {
        gold: { type: Number, default: 0 },
        items: { type: Map, of: Number, default: {} } // itemId -> quantity
    },
    targetOffer: {
        gold: { type: Number, default: 0 },
        items: { type: Map, of: Number, default: {} }
    },

    initiatorConfirmed: { type: Boolean, default: false },
    targetConfirmed: { type: Boolean, default: false },
    
    createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-delete after 10 mins
});

module.exports = mongoose.model('Trade', TradeSchema);