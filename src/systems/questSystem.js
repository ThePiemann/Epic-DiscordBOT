const Quest = require('../models/Quest');
const User = require('../models/User');
const { getNextLevelExp } = require('./xp');

const QUEST_POOL = [
    { type: 'chop', targetId: 'wood', targetAmount: 10, name: 'Lumberjack Duties', desc: 'Chop 10 pieces of wood.' },
    { type: 'mine', targetId: 'stone', targetAmount: 10, name: 'Stone Collector', desc: 'Mine 10 pieces of stone.' },
    { type: 'mine', targetId: 'iron_ore', targetAmount: 5, name: 'Iron Hunt', desc: 'Mine 5 pieces of iron ore.' },
    { type: 'kill', targetId: 'slime', targetAmount: 5, name: 'Slime Exterminator', desc: 'Defeat 5 Slimes.' },
    { type: 'kill', targetId: 'goblin', targetAmount: 3, name: 'Goblin Hunter', desc: 'Defeat 3 Goblins.' }
];

const REWARD_MATERIALS = ['wood', 'stone', 'iron_ore', 'slime_gel', 'wolf_pelt'];

async function getOrGenerateQuests(userId) {
    let questDoc = await Quest.findOne({ userId });
    const user = await User.findOne({ userId });
    const userLevel = user ? user.level : 1;
    const reqXp = getNextLevelExp(userLevel);

    const now = new Date();
    const isNewDay = !questDoc || (now - questDoc.lastReset) > (24 * 60 * 60 * 1000);

    if (isNewDay) {
        const selected = [];
        const poolCopy = [...QUEST_POOL];
        for (let i = 0; i < 3; i++) {
            const idx = Math.floor(Math.random() * poolCopy.length);
            const q = poolCopy.splice(idx, 1)[0];
            
            // Random rewards
            const gold = 200 + Math.floor(Math.random() * 300);
            
            // 5% to 10% of required XP
            const minXp = Math.floor(reqXp * 0.05);
            const maxXp = Math.floor(reqXp * 0.10);
            const xp = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
            
            const classXp = Math.floor(xp * 0.75);
            const items = [];
            
            // 50% chance for random material
            if (Math.random() > 0.5) {
                const matId = REWARD_MATERIALS[Math.floor(Math.random() * REWARD_MATERIALS.length)];
                items.push({ id: matId, amount: 2 });
            }
            
            // 20% chance for Relic Essence
            if (Math.random() > 0.8) {
                items.push({ id: 'relic_essence', amount: 1 });
            }

            selected.push({
                ...q,
                id: Math.random().toString(36).substring(7),
                currentAmount: 0,
                completed: false,
                claimed: false,
                reward: { gold, xp, classXp, items }
            });
        }

        if (!questDoc) {
            questDoc = new Quest({ userId, dailyQuests: selected, lastReset: now });
        } else {
            questDoc.dailyQuests = selected;
            questDoc.lastReset = now;
        }
        await questDoc.save();
    }

    // 🩹 Patch existing quests missing XP fields (Legacy support)
    let needsSave = false;
    questDoc.dailyQuests.forEach(q => {
        if (q.reward.xp === undefined || q.reward.xp === 0) {
            const minXp = Math.floor(reqXp * 0.05);
            const maxXp = Math.floor(reqXp * 0.10);
            q.reward.xp = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
            q.reward.classXp = Math.floor(q.reward.xp * 0.75);
            needsSave = true;
        }
    });

    if (needsSave) await questDoc.save();

    return questDoc;
}

async function updateQuestProgress(userId, type, targetId, amount = 1) {
    const questDoc = await Quest.findOne({ userId });
    if (!questDoc) return;

    let changed = false;
    questDoc.dailyQuests.forEach(q => {
        if (!q.completed && q.type === type && (q.targetId === targetId || q.targetId === 'any')) {
            q.currentAmount += amount;
            if (q.currentAmount >= q.targetAmount) {
                q.currentAmount = q.targetAmount;
                q.completed = true;
            }
            changed = true;
        }
    });

    if (changed) await questDoc.save();
}

module.exports = { getOrGenerateQuests, updateQuestProgress };