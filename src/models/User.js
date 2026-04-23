const mongoose = require('mongoose');
const crypto = require('crypto');
const { generateQualityName } = require('../utils/rarityUtils');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: String,
    class: { type: String, required: true },
    
    // Player Level (Base Stats + Attribute Points)
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    
    // Class Level (Class Skills + Class Growth Stats)
    classLevel: { type: Number, default: 1 },
    classExp: { type: Number, default: 0 },

    gold: { type: Number, default: 0 },
    
    // Base stats
    stats: {
        hp: { type: Number, default: 120 },
        maxHp: { type: Number, default: 120 },
        atk: { type: Number, default: 15 },
        def: { type: Number, default: 8 },
        matk: { type: Number, default: 10 },
        mdef: { type: Number, default: 8 },
        spd: { type: Number, default: 10 },
        stamina: { type: Number, default: 100 },
        maxStamina: { type: Number, default: 100 },
        mana: { type: Number, default: 60 },
        maxMana: { type: Number, default: 60 },
        cr_rate: { type: Number, default: 0.05 },
        cd_mult: { type: Number, default: 1.5 },
        energy: { type: Number, default: 0 },
        energy_regen: { type: Number, default: 100 }
    },

    // 🕒 REGEN SYSTEM
    lastRegen: { type: Date, default: Date.now },

    // Stat Allocation System
    unspentPoints: { type: Number, default: 0 },
    allocatedStats: {
        str: { type: Number, default: 0 },
        int: { type: Number, default: 0 },
        dex: { type: Number, default: 0 },
        con: { type: Number, default: 0 }
    },

    // Equipment System
    equipment: {
        type: Map, 
        of: String,
        default: {
            weapon: null, 
            head: null,
            chest: null,
            legs: null,
            feet: null,
            accessory: null
        }
    },

    // Relic Equipment System (5 slots)
    relicEquipment: {
        type: Map,
        of: String,
        default: {
            ring: null,
            necklace: null,
            earring: null,
            brooch: null,
            amulet: null
        }
    },

    // Active Temporary Buffs
    buffs: [{
        id: String,
        name: String,
        stat: String,
        value: Number,
        type: { type: String, enum: ['flat', 'percent'], default: 'flat' },
        durationBattles: { type: Number, default: 0 },
        expiresAt: { type: Date, default: null }
    }],

    // Inventory System
    inventory: {
        type: Map,
        of: Number,
        default: {},
    },

    // Relic Inventory
    relicInventory: [{
        instanceId: String,
        name: String,
        setId: String,
        slot: String,
        stars: Number,
        level: { type: Number, default: 0 },
        xp: { type: Number, default: 0 },
        mainStat: { stat: String, value: Number },
        subStats: [{ stat: String, value: Number }],
        isEquipped: { type: Boolean, default: false },
        isLocked: { type: Boolean, default: false },
        acquiredDate: { type: Date, default: Date.now }
    }],
    // Unique Items (Equipment with stats, rarity, etc.)
    uniqueInventory: [{
        instanceId: String,
        itemId: String,
        name: String,
        rarity: { type: String, default: 'Common' },
        stars: { type: Number, default: 1 },
        level: { type: Number, default: 1 },
        isEquipped: { type: Boolean, default: false },
        isLocked: { type: Boolean, default: false },
        affixes: [{
            id: String,
            name: String,
            stat: String,
            value: Number,
            type: { type: String, enum: ['flat', 'percent'], default: 'flat' }
        }],
        stats: {
            atk: { type: Number, default: 0 },
            def: { type: Number, default: 0 },
            matk: { type: Number, default: 0 },
            mdef: { type: Number, default: 0 },
            hp: { type: Number, default: 0 },
            spd: { type: Number, default: 0 },
            cr_rate: { type: Number, default: 0 },
            cd_mult: { type: Number, default: 0 }
        },
        acquiredDate: { type: Date, default: Date.now }
    }],

    toolDurability: {
        type: Map,
        of: Number,
        default: {}
    },

    cooldowns: {
        type: Map,
        of: Date, 
        default: {}
    },

    dailyStreak: { type: Number, default: 0 },
    lastDailyClaimDate: { type: Date, default: null },
    
    dailyPurchases: {
        type: Map,
        of: Number,
        default: {}
    },
    
    defeatedBosses: { type: [String], default: [] },
    
    redeemedCodes: { type: [String], default: [] },
    region: { type: String, default: 'verdant_expanse' },
    subRegion: { type: String, default: 'gentle_meads' },
    currentPlace: { type: String, default: null },
    travel: {
        isTraveling: { type: Boolean, default: false },
        destination: { type: String, default: null },
        arrivalDate: { type: Date, default: null }
    },
    inCombat: { type: Boolean, default: false },
    tutorialStep: { type: Number, default: 0 },
    fatigue: { type: Number, default: 0 }, // Increments with actions, consumed by rest
    job: {
        isActive: { type: Boolean, default: false },
        startTime: { type: Date, default: null },
        hours: { type: Number, default: 0 },
        salary: { type: Number, default: 0 } // Gold per hour
    },
    mailbox: [{
        sender: String,
        content: String, // Message
        attachments: [{ id: String, amount: Number }], // Items
        gold: { type: Number, default: 0 },
        date: { type: Date, default: Date.now }
    }],
    bank: {
        gold: { type: Number, default: 0 },
        inventory: { type: Map, of: Number, default: {} },
        uniqueInventory: [{
            instanceId: String,
            itemId: String,
            name: String,
            rarity: { type: String, default: 'Common' },
            stars: { type: Number, default: 1 },
            level: { type: Number, default: 1 },
            stats: Object,
            affixes: Array,
            acquiredDate: Date
        }],
        capacity: { type: Number, default: 20 },
        goldCapacity: { type: Number, default: 10000 },
        lastInterestDate: { type: Date, default: Date.now }
    },
    createdAt: { type: Date, default: Date.now }
});

// Helper method to easily add items to inventory
UserSchema.methods.addItem = function(itemId, amount = 1) {
    if (amount <= 0) return;
    const currentAmount = this.inventory.get(itemId) || 0;
    this.inventory.set(itemId, currentAmount + amount);
};

// Helper method to remove items from inventory
UserSchema.methods.removeItem = function(itemId, amount = 1) {
    if (amount <= 0) return 0;
    const currentAmount = this.inventory.get(itemId) || 0;
    const actualAmountRemoved = Math.min(amount, currentAmount);

    if (actualAmountRemoved === 0) return 0;

    const newAmount = currentAmount - actualAmountRemoved;
    if (newAmount > 0) {
        this.inventory.set(itemId, newAmount);
    } else {
        this.inventory.delete(itemId);
    }
    return actualAmountRemoved;
};

// --- BANK HELPERS ---
UserSchema.methods.addBankItem = function(itemId, amount = 1) {
    if (amount <= 0) return;
    const currentAmount = this.bank.inventory.get(itemId) || 0;
    this.bank.inventory.set(itemId, currentAmount + amount);
};

UserSchema.methods.removeBankItem = function(itemId, amount = 1) {
    if (amount <= 0) return 0;
    const currentAmount = this.bank.inventory.get(itemId) || 0;
    const actualAmountRemoved = Math.min(amount, currentAmount);
    if (actualAmountRemoved === 0) return 0;
    const newAmount = currentAmount - actualAmountRemoved;
    if (newAmount > 0) {
        this.bank.inventory.set(itemId, newAmount);
    } else {
        this.bank.inventory.delete(itemId);
    }
    return actualAmountRemoved;
};

UserSchema.methods.calculateInterest = function() {
    const now = new Date();
    const last = this.bank.lastInterestDate || this.createdAt;
    const diffMs = now - last;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays >= 1) {
        const rate = 0.0005; // 0.05% daily
        const interest = Math.floor(this.bank.gold * rate * Math.floor(diffDays));
        if (interest > 0) {
            this.bank.gold += interest;
            this.bank.lastInterestDate = new Date(last.getTime() + Math.floor(diffDays) * 24 * 60 * 60 * 1000);
            return interest;
        }
    }
    return 0;
};

// Helper method to add a unique item
UserSchema.methods.addUniqueItem = function(itemData, rarity, stats, affixes = [], stars = 1) {
    const instanceId = crypto.randomUUID();
    const qualityName = generateQualityName(itemData.name, rarity);
    const uniqueItem = {
        instanceId,
        itemId: itemData.id,
        name: qualityName,
        rarity,
        stars,
        stats,
        affixes,
        level: 1,
        acquiredDate: new Date()
    };
    this.uniqueInventory.push(uniqueItem);
    return uniqueItem;
};

// Helper to reset stats
UserSchema.methods.resetAllocatedStats = function() {
    let totalRefundedPoints = 0;
    totalRefundedPoints += this.allocatedStats.str;
    totalRefundedPoints += this.allocatedStats.int;
    totalRefundedPoints += this.allocatedStats.dex;
    totalRefundedPoints += this.allocatedStats.con;

    this.allocatedStats.str = 0;
    this.allocatedStats.int = 0;
    this.allocatedStats.dex = 0;
    this.allocatedStats.con = 0;

    this.unspentPoints += totalRefundedPoints;
    return totalRefundedPoints;
};

// Passive Regeneration Logic (5 per 10 minutes = 1 per 2 minutes)
UserSchema.methods.processRegen = function(maxStats = null) {
    const now = new Date();
    const last = this.lastRegen || this.createdAt;
    const diff = now.getTime() - last.getTime();
    const totalMinutesPassed = Math.floor(diff / 60000);
    const intervals = Math.floor(totalMinutesPassed / 2); // 1 unit per 2 minutes

    // Check for Active Food Regen Buff
    let extraHpRegen = 0;
    if (this.buffs && this.buffs.length > 0) {
        this.buffs = this.buffs.filter(b => !b.expiresAt || b.expiresAt > now);
        const regenBuff = this.buffs.find(b => b.stat === 'hp_regen');
        if (regenBuff) extraHpRegen = regenBuff.value;
    }

    const maxHp = (maxStats && maxStats.maxHp) ? maxStats.maxHp : this.stats.maxHp;
    const maxMana = (maxStats && maxStats.maxMana) ? maxStats.maxMana : this.stats.maxMana;
    const maxStam = (maxStats && maxStats.maxStamina) ? maxStats.maxStamina : this.stats.maxStamina;

    let changed = false;
    if (intervals > 0) {
        if (this.stats.mana < maxMana) {
            this.stats.mana = Math.min(maxMana, this.stats.mana + (intervals * 1));
            changed = true;
        }
        if (this.stats.stamina < maxStam) {
            this.stats.stamina = Math.min(maxStam, this.stats.stamina + (intervals * 1));
            changed = true;
        }
        if (this.stats.hp < maxHp) {
            const baseRegen = intervals * 1; // 1 HP per 2 mins base
            const bonusRegen = intervals * extraHpRegen; // extraHpRegen is HP per 2 mins
            this.stats.hp = Math.min(maxHp, this.stats.hp + baseRegen + bonusRegen);
            changed = true;
        }
        this.lastRegen = new Date(last.getTime() + (intervals * 2 * 60000));
    }
    return changed;
};

UserSchema.methods.checkTravel = async function() {
    if (!this.travel || !this.travel.isTraveling) return true; // Not traveling or initialized

    const now = new Date();
    if (now >= this.travel.arrivalDate) {
        // Travel complete!
        this.travel.isTraveling = false;
        this.travel.arrivalDate = null;
        this.travel.destination = null;
        
        // Mongoose 7+ requires MarkModified for nested objects, though usually save handles it.
        // For safety/legacy accounts, ensure it's marked.
        this.markModified('travel'); 
        
        await this.save();
        return true;
    }
    return false; // Still traveling
};

module.exports = mongoose.model('User', UserSchema);