const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
    gold: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    classXp: { type: Number, default: 0 },
    items: [{
        id: String,
        amount: Number
    }]
}, { _id: false });

const DailyQuestSchema = new mongoose.Schema({
    id: String,
    type: String, // 'kill', 'mine', 'chop', 'gather'
    targetId: String,
    targetAmount: Number,
    currentAmount: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    name: String,
    desc: String,
    reward: RewardSchema
}, { _id: false });

const QuestSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    dailyQuests: [DailyQuestSchema],
    lastReset: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quest', QuestSchema);