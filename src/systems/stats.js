const WEAPONS = require('../data/weapon'); 
const ARMOR = require('../data/armor');
const CLASSES = require('../data/classes');

/**
 * Calculates base stats based on player and class level.
 */
function calculateBaseStats(user) {
    const plvl = user.level || 1;
    const clvl = user.classLevel || 1;
    const classData = CLASSES[user.class] || CLASSES['warrior'];
    const growth = classData.growthStats || { 
        maxHp: 10, maxMana: 5, maxStamina: 2, atk: 2, def: 1, matk: 2, mdef: 1, spd: 0 
    };

    let stats = {
        maxHp: 100 + ((plvl - 1) * 3) + ((clvl - 1) * growth.maxHp), 
        maxMana: 50 + ((plvl - 1) * 1) + ((clvl - 1) * growth.maxMana),
        maxStamina: 100 + ((plvl - 1) * 1) + ((clvl - 1) * growth.maxStamina),
        atk: 10 + (plvl * 0.5) + (clvl * growth.atk),
        def: 5 + (plvl * 0.2) + (clvl * growth.def),
        matk: 10 + (plvl * 0.5) + (clvl * growth.matk),
        mdef: 5 + (plvl * 0.2) + (clvl * growth.mdef),
        spd: 10 + ((clvl - 1) * growth.spd), 
        cr_rate: 0.05,
        cd_mult: 1.50,
        energy_regen: 100,
        energy: user.stats?.energy || 0
    };

    if (classData.bonusStats) {
        for (const [key, val] of Object.entries(classData.bonusStats)) {
            if (stats[key] !== undefined) {
                stats[key] += val;
            } else if (key === 'cr_rate' || key === 'cd_mult') {
                stats[key] = (stats[key] || 0) + val;
            }
        }
    }

    return stats;
}

/**
 * Main calculation logic.
 * Follows the "Independent Additive %" model:
 * 1. Core = Base + Gear_Flat
 * 2. Gear_Bonus = Core * Gear_%
 * 3. Relic_Bonus = Core * Relic_%
 * 4. Buff_Bonus = Core * Buff_%
 * 5. Final = Core + Gear_Bonus + Relic_Bonus + Buff_Bonus + Flat_Affixes + Flat_Buffs
 * 
 * Note: Crit Rate and Crit Damage are ALWAYS additive (Flat).
 */
function calculateEffectiveStats(user) {
    // --- 1. CORE STATS (Level + Gear Raw) ---
    let core = calculateBaseStats(user);

    // Apply Allocated Points to Core
    if (user.allocatedStats) {
        const allocated = user.allocatedStats;
        core.atk += (allocated.str * 2.0); 
        core.def += (allocated.str * 1.0); 
        core.matk += (allocated.int * 2.0); 
        core.mdef += (allocated.int * 1.0);
        core.maxMana += (allocated.int * 5);
        core.maxHp += (allocated.con * 10); 
        core.maxStamina += (allocated.con * 2);
        core.spd += (allocated.dex * 0.5); 
        core.cd_mult += (allocated.dex * 0.005); // 0.5% Crit Damage per DEX point
    }

    // Accumulators
    let gearMultipliers = { atk: 0, def: 0, matk: 0, mdef: 0, maxHp: 0, spd: 0 };
    let relicMultipliers = { atk: 0, def: 0, matk: 0, mdef: 0, maxHp: 0, spd: 0, energy_regen: 0 };
    let buffMultipliers = { atk: 0, def: 0, matk: 0, mdef: 0, maxHp: 0, spd: 0 };
    let flatAdds = { atk: 0, def: 0, matk: 0, mdef: 0, maxHp: 0, spd: 0, cr_rate: 0, cd_mult: 0 };

    const gearSetCounts = {};
    const relicSetCounts = {};

    // --- 2. PROCESS GEAR (Weapon & Armor) ---
    if (user.equipment) {
        const entries = user.equipment instanceof Map ? user.equipment.entries() : Object.entries(user.equipment);
        for (const [slot, equippedId] of entries) {
            if (!equippedId) continue;

            let itemData = null;
            let uniqueItem = user.uniqueInventory?.find(i => i.instanceId === equippedId);

            if (uniqueItem) {
                itemData = (slot === 'weapon') ? WEAPONS[uniqueItem.itemId] : ARMOR[uniqueItem.itemId];
                if (itemData?.baseAttack) core.atk += itemData.baseAttack;
                if (itemData?.baseDefense) core.def += itemData.baseDefense;

                if (uniqueItem.stats) {
                    for (const [stat, val] of Object.entries(uniqueItem.stats)) {
                        if (stat === 'hp') core.maxHp += val;
                        else if (stat === 'cr_rate' || stat === 'cd_mult') flatAdds[stat] += val;
                        else if (core[stat] !== undefined) core[stat] += val;
                    }
                }

                if (uniqueItem.affixes) {
                    for (const affix of uniqueItem.affixes) {
                        const s = affix.stat;
                        if (s === 'cr_rate' || s === 'cd_mult') {
                            flatAdds[s] += (affix.type === 'percent' ? affix.value / 100 : affix.value);
                        } else if (affix.type === 'flat') {
                            const fKey = (s === 'hp') ? 'maxHp' : s;
                            if (flatAdds[fKey] !== undefined) flatAdds[fKey] += affix.value;
                        } else {
                            const mKey = (s === 'hp') ? 'maxHp' : s;
                            if (gearMultipliers[mKey] !== undefined) gearMultipliers[mKey] += affix.value / 100;
                        }
                    }
                }
            } else {
                itemData = (slot === 'weapon') ? WEAPONS[equippedId] : ARMOR[equippedId];
                if (itemData) {
                    if (itemData.baseAttack) core.atk += itemData.baseAttack;
                    if (itemData.baseDefense) core.def += itemData.baseDefense;
                    if (itemData.stats) {
                        if (itemData.stats.hp) core.maxHp += itemData.stats.hp;
                        if (itemData.stats.atk_percent) gearMultipliers.atk += itemData.stats.atk_percent;
                        if (itemData.stats.matk_percent) gearMultipliers.matk += itemData.stats.matk_percent;
                        if (itemData.stats.spd) core.spd += itemData.stats.spd;
                        if (itemData.stats.cr_rate) flatAdds.cr_rate += itemData.stats.cr_rate;
                        if (itemData.stats.cd_mult) flatAdds.cd_mult += itemData.stats.cd_mult;
                    }
                }
            }
            if (itemData?.set) gearSetCounts[itemData.set] = (gearSetCounts[itemData.set] || 0) + 1;
        }
    }

    // --- 3. PROCESS RELICS ---
    if (user.relicEquipment) {
        const relicEntries = user.relicEquipment instanceof Map ? user.relicEquipment.entries() : Object.entries(user.relicEquipment);
        for (const [slot, instanceId] of relicEntries) {
            if (!instanceId) continue;
            const relic = user.relicInventory?.find(r => r.instanceId === instanceId);
            if (relic) {
                const processSingleStat = (stat, value) => {
                    if (stat === 'hp') flatAdds.maxHp += value;
                    else if (stat === 'atk_matk') { flatAdds.atk += value; flatAdds.matk += value; }
                    else if (stat === 'energy_regen') relicMultipliers.energy_regen += value;
                    else if (stat === 'cr_rate' || stat === 'cd_mult') {
                        flatAdds[stat] += value; // CR/CD are always flat additive
                    }
                    else if (stat.endsWith('_percent')) {
                        const mKey = stat.replace('_percent', '').replace('hp', 'maxHp');
                        if (relicMultipliers[mKey] !== undefined) relicMultipliers[mKey] += value;
                    }
                    else if (flatAdds[stat] !== undefined) {
                        flatAdds[stat] += value;
                    }
                };

                processSingleStat(relic.mainStat.stat, relic.mainStat.value);
                for (const sub of relic.subStats) {
                    processSingleStat(sub.stat, sub.value);
                }
                relicSetCounts[relic.setId] = (relicSetCounts[relic.setId] || 0) + 1;
            }
        }
    }

    // --- 4. PROCESS BUFFS (Consumables/Food) ---
    if (user.buffs && user.buffs.length > 0) {
        const now = new Date();
        user.buffs = user.buffs.filter(b => !b.expiresAt || b.expiresAt > now);
        
        for (const buff of user.buffs) {
            const statKey = buff.stat === 'hp' ? 'maxHp' : buff.stat;
            if (buff.type === 'percent') {
                if (statKey === 'cr_rate' || statKey === 'cd_mult') {
                    flatAdds[statKey] += buff.value;
                } else if (buffMultipliers[statKey] !== undefined) {
                    buffMultipliers[statKey] += buff.value;
                }
            } else {
                if (flatAdds[statKey] !== undefined) flatAdds[statKey] += buff.value;
            }
        }
    }

    // --- 5. APPLY SET BONUSES ---
    for (const [setName, count] of Object.entries(gearSetCounts)) {
        if (setName === 'slime') {
            if (count >= 2) flatAdds.maxHp += 50;
            if (count >= 4) flatAdds.def += 15;
        }
    }

    for (const [setId, count] of Object.entries(relicSetCounts)) {
        if (count >= 2) {
            if (setId === 'gladiators_resolve') relicMultipliers.atk += 0.18;
            else if (setId === 'mages_insight') relicMultipliers.matk += 0.18; 
            else if (setId === 'assassins_shadow') flatAdds.spd += 10;
            else if (setId === 'paladins_grace') relicMultipliers.mdef += 0.20;
            else if (setId === 'slime_kings_secret') flatAdds.maxHp += 100;
        }
        if (count >= 4) {
            if (setId === 'gladiators_resolve') relicMultipliers.atk += 0.15;
            else if (setId === 'mages_insight') relicMultipliers.matk += 0.15;
            else if (setId === 'assassins_shadow') flatAdds.cr_rate += 0.15; // Set bonus is also flat additive
            else if (setId === 'paladins_grace') relicMultipliers.def += 0.20;
            else if (setId === 'slime_kings_secret') flatAdds.maxHp += 200;
        }
    }

    // --- 6. FINAL ASSEMBLY ---
    const final = { ...core };
    
    // Scaleable stats
    const statsToMultiply = ['atk', 'def', 'matk', 'mdef', 'maxHp', 'spd'];
    statsToMultiply.forEach(s => {
        const gearBonus = core[s] * (gearMultipliers[s] || 0);
        const relicBonus = core[s] * (relicMultipliers[s] || 0);
        const buffBonus = core[s] * (buffMultipliers[s] || 0);
        final[s] = core[s] + gearBonus + relicBonus + buffBonus + (flatAdds[s] || 0);
    });

    // Rate stats (Always flat additive)
    final.cr_rate = core.cr_rate + flatAdds.cr_rate;
    final.cd_mult = core.cd_mult + flatAdds.cd_mult;
    final.energy_regen = core.energy_regen + (relicMultipliers.energy_regen * 100);

    // Sync back to user document
    if (user.stats) {
        user.stats.maxHp = Math.floor(final.maxHp);
        user.stats.maxMana = Math.floor(final.maxMana);
        user.stats.maxStamina = Math.floor(final.maxStamina);
        user.stats.atk = Math.floor(final.atk);
        user.stats.def = Math.floor(final.def);
        user.stats.matk = Math.floor(final.matk);
        user.stats.mdef = Math.floor(final.mdef);
        user.stats.spd = Math.floor(final.spd);
        user.stats.cr_rate = final.cr_rate;
        user.stats.cd_mult = final.cd_mult;
        user.stats.energy_regen = Math.floor(final.energy_regen);

        final.hp = Math.min(user.stats.hp, final.maxHp);
        final.mana = Math.min(user.stats.mana, final.maxMana);
        final.stamina = Math.min(user.stats.stamina, final.maxStamina);
    }

    return final;
}

module.exports = { 
    calculateEffectiveStats,
    calculateBaseStats
};