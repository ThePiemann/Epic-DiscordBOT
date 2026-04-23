const mongoose = require('mongoose');

const GlobalStateSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'main' },
    boosts: {
        xp: { type: Number, default: 1.0 },
        xp_expires: { type: Date, default: null },
        
        gathering: { type: Number, default: 1.0 },
        gathering_expires: { type: Date, default: null },
        
        dropRate: { type: Number, default: 1.0 },
        dropRate_expires: { type: Date, default: null },
        
        gold: { type: Number, default: 1.0 },
        gold_expires: { type: Date, default: null }
    },
    eventMessage: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GlobalState', GlobalStateSchema);