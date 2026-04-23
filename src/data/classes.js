const CLASSES = {
    // --- TIER 1 CLASSES ---
    warrior: {
        id: 'warrior',
        name: 'Warrior',
        tier: 1,
        description: 'A strong fighter with high health and defense.',
        // Static bonus applied simply for being this class
        bonusStats: {
            maxHp: 20,
            atk: 5,
            def: 5
        },
        skills: [
            {
                id: 'power_strike',
                name: 'Power Strike',
                description: 'A heavy blow that deals massive physical damage.',
                cost: { type: 'stamina', amount: 20 },
                multiplier: 1.8, // 180% ATK
                stat: 'atk',
                applyStatus: {
                    chance: 0.2,
                    config: { id: 'stun', name: 'Stun', emoji: '😵', duration: 1 }
                }
            },
            {
                id: 'cleave',
                name: 'Cleave',
                description: 'A wide swing to hit multiple enemies (or just hit hard).',
                cost: { type: 'stamina', amount: 30 },
                multiplier: 1.5,
                stat: 'atk'
            }
        ],
        ultimate: {
            id: 'berserker_rage',
            name: 'Berserker Rage',
            description: 'Explode with fury, dealing massive damage.',
            energyCost: 100, 
            multiplier: 4.5, 
            stat: 'atk'
        },
        // Stats gained per level (Multiplied by Level)
        growthStats: {
            maxHp: 12, // 10 base + 2
            maxMana: 5,
            maxStamina: 2,
            atk: 2.2, // Slightly better than base 2
            def: 1.2,
            matk: 1, // Warriors have low magic growth
            mdef: 1,
            spd: 0
        },
        promotions: ['knight', 'berserker']
    },
    mage: {
        id: 'mage',
        name: 'Mage',
        tier: 1,
        description: 'A master of arcane arts with high mana and magic damage.',
        bonusStats: {
            maxHp: -10,
            matk: 10,
            maxMana: 20
        },
        skills: [
            {
                id: 'fireball',
                name: 'Fireball',
                description: 'Hurls a ball of fire dealing high magic damage.',
                cost: { type: 'mana', amount: 25 },
                multiplier: 2.0, // 200% MATK
                stat: 'matk',
                applyStatus: {
                    chance: 0.3,
                    config: { id: 'burn', name: 'Burn', emoji: '🔥', duration: 2 }
                }
            },
            {
                id: 'ice_spike',
                name: 'Ice Spike',
                description: 'Pierce the enemy with jagged ice.',
                cost: { type: 'mana', amount: 35 },
                multiplier: 1.8, 
                stat: 'matk'
            }
        ],
        ultimate: {
            id: 'inferno',
            name: 'Inferno',
            description: 'Incinerate the battlefield.',
            energyCost: 120, 
            multiplier: 5.5, 
            stat: 'matk'
        },
        growthStats: {
            maxHp: 8,
            maxMana: 8,
            maxStamina: 1,
            atk: 1,
            def: 0.8,
            matk: 2.5, // High magic growth
            mdef: 1.5,
            spd: 0
        },
        promotions: ['archmage', 'spellblade'] // Added for future expansion
    },
    rogue: {
        id: 'rogue',
        name: 'Rogue',
        tier: 1,
        description: 'A swift killer who relies on critical hits and evasion.',
        bonusStats: {
            spd: 5,
            cr_rate: 0.05
        },
        skills: [
            {
                id: 'backstab',
                name: 'Backstab',
                description: 'A sneaky attack with high critical chance.',
                cost: { type: 'stamina', amount: 25 },
                multiplier: 1.5, // 150% ATK
                stat: 'atk',
                bonusCrit: 0.2 // +20% Crit Chance
            },
            {
                id: 'poison_tip',
                name: 'Poison Tip',
                description: 'Coat your blade in venom for extra damage.',
                cost: { type: 'stamina', amount: 30 },
                multiplier: 1.4, 
                stat: 'atk',
                applyStatus: {
                    chance: 1.0,
                    config: { id: 'poison', name: 'Poison', emoji: '🤢', duration: 3 }
                }
            }
        ],
        ultimate: {
            id: 'shadow_dance',
            name: 'Shadow Dance',
            description: 'Strike from the shadows.',
            energyCost: 90, 
            multiplier: 3.8, 
            stat: 'atk'
        },
        growthStats: {
            maxHp: 10,
            maxMana: 5,
            maxStamina: 3,
            atk: 2,
            def: 1,
            matk: 1,
            mdef: 1,
            spd: 0.5 // Rogues get faster over time
        },
        promotions: ['assassin', 'ranger']
    },
    paladin: {
        id: 'paladin',
        name: 'Paladin',
        tier: 1,
        description: 'A holy warrior who balances offense with healing magic.',
        bonusStats: {
            maxHp: 10,
            def: 5,
            matk: 5
        },
        skills: [
            {
                id: 'holy_smite',
                name: 'Holy Smite',
                description: 'Smite the enemy with holy light.',
                cost: { type: 'mana', amount: 20 },
                multiplier: 1.6, 
                stat: 'matk',
                applyStatus: {
                    chance: 0.25,
                    config: { id: 'stun', name: 'Blind', emoji: '😵', duration: 1 }
                }
            },
            {
                id: 'guardian_shield',
                name: 'Guardian Shield',
                description: 'Bash the enemy with holy protection.',
                cost: { type: 'mana', amount: 30 },
                multiplier: 1.2, 
                stat: 'def' 
            }
        ],
        ultimate: {
            id: 'judgment',
            name: 'Judgment',
            description: 'Call down the judgment of the heavens.',
            energyCost: 110, 
            multiplier: 4.0, 
            stat: 'matk'
        },
        growthStats: {
            maxHp: 11,
            maxMana: 6,
            maxStamina: 2,
            atk: 1.8,
            def: 1.5,
            matk: 1.5,
            mdef: 1.5,
            spd: 0
        },
        promotions: ['templar', 'crusader']
    },

    // --- TIER 2 CLASSES (Warrior Paths) ---
    knight: {
        id: 'knight',
        name: 'Knight',
        tier: 2,
        description: 'An unstoppable fortress of steel. Focuses on Defense and Health.',
        requirements: {
            class: 'warrior',
            classLevel: 20 
        },
        bonusStats: {
            maxHp: 350, 
            atk: 30,
            def: 40,
            mdef: 20
        },
        skills: [
            {
                id: 'shield_bash',
                name: 'Shield Bash',
                description: 'Strike with your shield, using Defense as power.',
                cost: { type: 'stamina', amount: 30 },
                multiplier: 2.5, // 250% DEF
                stat: 'def' 
            }
        ],
        ultimate: {
            id: 'fortress_slam',
            name: 'Fortress Slam',
            description: 'Use your shield to crush the enemy with the weight of a mountain.',
            energyCost: 110, 
            multiplier: 5.0, 
            stat: 'def'
        },
        growthStats: {
            maxHp: 18, 
            maxMana: 5,
            maxStamina: 3,
            atk: 2.2,
            def: 2.5, 
            matk: 1,
            mdef: 1.5,
            spd: 0
        },
        promotions: []
    },
    berserker: {
        id: 'berserker',
        name: 'Berserker',
        tier: 2,
        description: 'A hybrid juggernaut who trades defense for raw power and speed.',
        requirements: {
            class: 'warrior',
            classLevel: 20
        },
        bonusStats: {
            maxHp: 280,
            atk: 60, 
            def: 5, 
            spd: 10
        },
        skills: [
            {
                id: 'rage_cleave',
                name: 'Rage Cleave',
                description: 'A reckless swing that decimates enemies.',
                cost: { type: 'stamina', amount: 35 },
                multiplier: 3.0, // 300% ATK
                stat: 'atk'
            }
        ],
        ultimate: {
            id: 'world_breaker',
            name: 'World Breaker',
            description: 'Shatter the earth and the enemy standing on it.',
            energyCost: 100, 
            multiplier: 6.0, 
            stat: 'atk'
        },
        growthStats: {
            maxHp: 14,
            maxMana: 4,
            maxStamina: 4,
            atk: 3.5, 
            def: 0.5, 
            matk: 0.5,
            mdef: 0.5,
            spd: 0.2
        },
        promotions: []
    },
    
    // --- TIER 2 CLASSES (Mage Paths) ---
    archmage: {
        id: 'archmage',
        name: 'Archmage',
        tier: 2,
        description: 'A supreme caster who has unlocked the true potential of arcane magic.',
        requirements: {
            class: 'mage',
            classLevel: 20
        },
        bonusStats: {
            maxHp: 150,
            maxMana: 300, // Massive Mana pool
            matk: 60,     // High Magic Damage
            mdef: 30,
            def: 10
        },
        skills: [
            {
                id: 'meteor_swarm',
                name: 'Meteor Swarm',
                description: 'Summon meteors to crush your foe.',
                cost: { type: 'mana', amount: 50 },
                multiplier: 3.5, // 350% MATK
                stat: 'matk'
            }
        ],
        ultimate: {
            id: 'supernova',
            name: 'Supernova',
            description: 'Unleash the power of a dying star.',
            energyCost: 130, 
            multiplier: 7.0, 
            stat: 'matk'
        },
        growthStats: {
            maxHp: 10,
            maxMana: 20,  // Huge mana growth
            maxStamina: 2,
            atk: 1,
            def: 1,
            matk: 4.0,    // Extreme Magic growth
            mdef: 2.5,
            spd: 0
        },
        promotions: []
    },
    spellblade: {
        id: 'spellblade',
        name: 'Spellblade',
        tier: 2,
        description: 'A battle-mage who weaves magic into their melee strikes.',
        requirements: {
            class: 'mage',
            classLevel: 20
        },
        bonusStats: {
            maxHp: 250,
            maxMana: 150,
            atk: 40,
            matk: 40,
            def: 20,
            spd: 5
        },
        skills: [
            {
                id: 'arcane_slash',
                name: 'Arcane Slash',
                description: 'A blade strike infused with raw magic.',
                cost: { type: 'mana', amount: 30 },
                multiplier: 2.2, // 220% MATK
                stat: 'matk'
            }
        ],
        ultimate: {
            id: 'dimension_rend',
            name: 'Dimension Rend',
            description: 'Cut through the fabric of reality itself.',
            energyCost: 110, 
            multiplier: 5.0, 
            stat: 'matk'
        },
        growthStats: {
            maxHp: 14,
            maxMana: 10,
            maxStamina: 3,
            atk: 2.5,     // Balanced offense
            def: 1.5,
            matk: 2.5,    // Balanced offense
            mdef: 1.5,
            spd: 0.5      // Agile
        },
        promotions: []
    },

    // --- TIER 2 CLASSES (Rogue Paths) ---
    assassin: {
        id: 'assassin',
        name: 'Assassin',
        tier: 2,
        description: 'A shadow in the night. Focuses on lethal critical hits and raw speed.',
        requirements: {
            class: 'rogue',
            classLevel: 20
        },
        bonusStats: {
            maxHp: 200,
            atk: 55,
            spd: 15,
            cr_rate: 0.15, // +15% Crit Rate
            cd_mult: 0.5   // +50% Crit Damage
        },
        skills: [
            {
                id: 'execute',
                name: 'Execute',
                description: 'A precise strike aimed at vitals. Massive crit bonus.',
                cost: { type: 'stamina', amount: 35 },
                multiplier: 2.5,
                stat: 'atk',
                bonusCrit: 0.3 // +30% Crit Chance
            }
        ],
        ultimate: {
            id: 'phantom_assault',
            name: 'Phantom Assault',
            description: 'Strike from every direction at once.',
            energyCost: 90, 
            multiplier: 6.0, 
            stat: 'atk'
        },
        growthStats: {
            maxHp: 12,
            maxMana: 5,
            maxStamina: 4,
            atk: 3.2,
            def: 0.8,
            matk: 0.5,
            mdef: 0.8,
            spd: 0.6
        },
        promotions: []
    },
    ranger: {
        id: 'ranger',
        name: 'Ranger',
        tier: 2,
        description: 'A master of the wild. Exceptional speed and sustained damage.',
        requirements: {
            class: 'rogue',
            classLevel: 20
        },
        bonusStats: {
            maxHp: 240,
            atk: 45,
            def: 15,
            spd: 20,
            cr_rate: 0.10
        },
        skills: [
            {
                id: 'barrage',
                name: 'Barrage',
                description: 'Rain down a flurry of strikes.',
                cost: { type: 'stamina', amount: 30 },
                multiplier: 2.8,
                stat: 'atk'
            }
        ],
        ultimate: {
            id: 'natures_wrath',
            name: "Nature's Wrath",
            description: 'Unleash the full fury of the wild.',
            energyCost: 100, 
            multiplier: 5.2, 
            stat: 'atk'
        },
        growthStats: {
            maxHp: 14,
            maxMana: 6,
            maxStamina: 5,
            atk: 2.8,
            def: 1.2,
            matk: 1.0,
            mdef: 1.2,
            spd: 0.8
        },
        promotions: []
    },

    // --- TIER 2 CLASSES (Paladin Paths) ---
    templar: {
        id: 'templar',
        name: 'Templar',
        tier: 2,
        description: 'A holy wall that protects the weak. Unrivaled defense and survivability.',
        requirements: {
            class: 'paladin',
            classLevel: 20
        },
        bonusStats: {
            maxHp: 400,
            def: 50,
            mdef: 40,
            matk: 20
        },
        skills: [
            {
                id: 'holy_aegis',
                name: 'Holy Aegis',
                description: 'Bash with a shield of divine light.',
                cost: { type: 'mana', amount: 35 },
                multiplier: 3.0,
                stat: 'def'
            }
        ],
        ultimate: {
            id: 'divine_sanctuary',
            name: 'Divine Sanctuary',
            description: 'Invoke an impenetrable holy barrier.',
            energyCost: 120, 
            multiplier: 5.5, 
            stat: 'def'
        },
        growthStats: {
            maxHp: 20,
            maxMana: 8,
            maxStamina: 3,
            atk: 1.5,
            def: 3.0,
            matk: 1.5,
            mdef: 2.5,
            spd: 0
        },
        promotions: []
    },
    crusader: {
        id: 'crusader',
        name: 'Crusader',
        tier: 2,
        description: 'A holy warrior on a mission. Balanced in physical and divine power.',
        requirements: {
            class: 'paladin',
            classLevel: 20
        },
        bonusStats: {
            maxHp: 320,
            atk: 40,
            matk: 40,
            def: 25,
            mdef: 25
        },
        skills: [
            {
                id: 'radiant_cross',
                name: 'Radiant Cross',
                description: 'Strike with a cross of pure energy.',
                cost: { type: 'mana', amount: 30 },
                multiplier: 2.6,
                stat: 'matk'
            }
        ],
        ultimate: {
            id: 'heavens_fall',
            name: "Heaven's Fall",
            description: 'Call down a pillar of light to incinerate evil.',
            energyCost: 110, 
            multiplier: 6.5, 
            stat: 'matk'
        },
        growthStats: {
            maxHp: 16,
            maxMana: 10,
            maxStamina: 3,
            atk: 2.4,
            def: 2.0,
            matk: 2.4,
            mdef: 2.0,
            spd: 0.2
        },
        promotions: []
    }
};

module.exports = CLASSES;