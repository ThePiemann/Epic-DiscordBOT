// src/data/enemies.js

const ENEMIES = [
    { 
        id: 'goblin', 
        name: 'Wild Goblin', 
        type: 'normal',
        hp: 85, atk: 18, matk: 0, def: 2, mdef: 1, spd: 8, 
        cr_rate: 0.05, cd_mult: 1.2,
        expReward: 25, goldReward: 10,
        region: 'Plain', sub_region: 'Meadow',
        drops: [
            { item: 'goblin_ear', chance: 0.45, min: 1, max: 1 },
            { item: 'tough_goblin_ear', chance: 0.1, min: 1, max: 1 },
            { item: 'rusty_dagger', chance: 0.1, min: 1, max: 1 }
        ]
    },
    {
        id: 'slime',
        name: 'Blue Slime',
        type: 'normal',
        hp: 67, atk: 11, matk: 0, def: 1, mdef: 6, spd: 5,
        cr_rate: 0.08, cd_mult: 1.1,
        expReward: 20, goldReward: 8,
        region: 'Plain', sub_region: 'Meadow',
        drops: [
            { item: 'slime_gel', chance: 0.6, min: 1, max: 2 },
            { item: 'sticky_slime_gel', chance: 0.15, min: 1, max: 1 },
            { item: 'crystallized_slime', chance: 0.05, min: 1, max: 1 }
        ]
    },
    { 
        id: 'forest_wolf', 
        name: 'Forest Wolf', 
        type: 'normal',
        hp: 90, atk: 20, matk: 0, def: 6, mdef: 4, spd: 15, 
        cr_rate: 0.1, cd_mult: 1.5,
        expReward: 50, goldReward: 25,
        region: 'Plain', sub_region: 'Forest',
        drops: [
            { item: 'wolf_pelt', chance: 0.4, min: 1, max: 1 },
            { item: 'thick_wolf_pelt', chance: 0.1, min: 1, max: 1 },
            { item: 'wolf_fang', chance: 0.3, min: 1, max: 2 },
            { item: 'sharp_wolf_fang', chance: 0.1, min: 1, max: 1 }
        ]
    },
    { 
        id: 'mountain_troll', 
        name: 'Mountain Troll', 
        type: 'elite',
        hp: 225, atk: 40, matk: 6, def: 17, mdef: 9, spd: 5, 
        cr_rate: 0.05, cd_mult: 1.2,
        expReward: 150, goldReward: 70,
        region: 'Mountain',
        drops: [
            { item: 'troll_skin', chance: 0.5, min: 1, max: 1 },
            { item: 'huge_bone', chance: 0.3, min: 1, max: 1 }
        ]
    },
    // Verdant Expanse Enemies
    {
        id: 'scarecrow',
        name: 'Haunted Scarecrow',
        type: 'normal',
        hp: 101, atk: 22, matk: 0, def: 4, mdef: 2, spd: 6,
        cr_rate: 0.05, cd_mult: 1.2,
        expReward: 30, goldReward: 12,
        region: 'verdant_expanse', sub_region: 'golden_harvest_fields',
        drops: [
            { item: 'straw', chance: 0.8, min: 2, max: 5 },
            { item: 'cursed_fabric', chance: 0.2, min: 1, max: 1 }
        ]
    },
    {
        id: 'field_mouse',
        name: 'Giant Field Mouse',
        type: 'normal',
        hp: 45, atk: 9, matk: 0, def: 0, mdef: 0, spd: 12,
        cr_rate: 0.1, cd_mult: 1.2,
        expReward: 10, goldReward: 5,
        region: 'verdant_expanse', sub_region: 'golden_harvest_fields',
        drops: [
            { item: 'mouse_tail', chance: 0.5, min: 1, max: 1 }
        ]
    },
    {
        id: 'crow',
        name: 'Thieving Crow',
        type: 'normal',
        hp: 56, atk: 13, matk: 0, def: 1, mdef: 1, spd: 14,
        cr_rate: 0.15, cd_mult: 1.1,
        expReward: 15, goldReward: 15,
        region: 'verdant_expanse', sub_region: 'golden_harvest_fields',
        drops: [
            { item: 'shiny_bead', chance: 0.3, min: 1, max: 1 },
            { item: 'crow_feather', chance: 0.6, min: 1, max: 3 }
        ]
    },
    {
        id: 'harvest_golem',
        name: 'Ancient Harvest Golem',
        type: 'elite',
        hp: 250, atk: 35, matk: 0, def: 15, mdef: 5, spd: 4,
        cr_rate: 0.05, cd_mult: 1.5,
        expReward: 120, goldReward: 60,
        region: 'verdant_expanse', sub_region: 'golden_harvest_fields',
        drops: [
            { item: 'ancient_gear', chance: 0.4, min: 1, max: 2 },
            { item: 'hay_bale', chance: 1.0, min: 1, max: 3 }
        ]
    },
    {
        id: 'harpy',
        name: 'Screeching Harpy',
        type: 'normal',
        hp: 124, atk: 28, matk: 6, def: 4, mdef: 7, spd: 16,
        cr_rate: 0.1, cd_mult: 1.3,
        expReward: 60, goldReward: 30,
        region: 'verdant_expanse', sub_region: 'gale_force_bluffs',
        drops: [
            { item: 'harpy_feather', chance: 0.6, min: 1, max: 2 },
            { item: 'harpy_talon', chance: 0.2, min: 1, max: 1 }
        ]
    },
    {
        id: 'cliff_stalker',
        name: 'Mountain Cliff Stalker',
        type: 'normal',
        hp: 140, atk: 32, matk: 0, def: 10, mdef: 5, spd: 22,
        cr_rate: 0.2, cd_mult: 1.8,
        expReward: 80, goldReward: 40,
        region: 'verdant_expanse', sub_region: 'gale_force_bluffs',
        drops: [
            { item: 'stalker_claw', chance: 0.5, min: 1, max: 2 },
            { item: 'tough_hide', chance: 0.3, min: 1, max: 1 }
        ]
    },
    {
        id: 'wind_elemental',
        name: 'Lesser Wind Elemental',
        type: 'normal',
        hp: 146, atk: 22, matk: 28, def: 2, mdef: 17, spd: 18,
        cr_rate: 0.05, cd_mult: 1.2,
        expReward: 70, goldReward: 35,
        region: 'verdant_expanse', sub_region: 'gale_force_bluffs',
        drops: [
            { item: 'wind_essence', chance: 0.4, min: 1, max: 2 }
        ]
    },
    {
        id: 'stone_golem',
        name: 'Rogue Stone Golem',
        type: 'normal',
        hp: 281, atk: 45, matk: 0, def: 28, mdef: 6, spd: 3,
        cr_rate: 0.02, cd_mult: 1.5,
        expReward: 100, goldReward: 50,
        region: 'verdant_expanse', sub_region: 'iron_thistle_waste',
        drops: [
            { item: 'stone_heart', chance: 0.1, min: 1, max: 1 },
            { item: 'rubble', chance: 1.0, min: 2, max: 5 }
        ]
    },
    {
        id: 'waste_marauder',
        name: 'Waste Marauder',
        type: 'normal',
        hp: 200, atk: 42, matk: 0, def: 12, mdef: 10, spd: 15,
        cr_rate: 0.1, cd_mult: 1.4,
        expReward: 90, goldReward: 45,
        region: 'verdant_expanse', sub_region: 'iron_thistle_waste',
        drops: [
            { item: 'stolen_goods', chance: 0.3, min: 1, max: 1 },
            { item: 'worn_blade', chance: 0.2, min: 1, max: 1 }
        ]
    },
    {
        id: 'thorn_beast',
        name: 'Thorn Beast',
        type: 'normal',
        hp: 180, atk: 34, matk: 0, def: 11, mdef: 9, spd: 10,
        cr_rate: 0.08, cd_mult: 1.4,
        expReward: 80, goldReward: 40,
        region: 'verdant_expanse', sub_region: 'iron_thistle_waste',
        drops: [
            { item: 'sharp_thorn', chance: 0.7, min: 1, max: 3 }
        ]
    },
    {
        id: 'star_fallen_titan',
        name: 'Star-Fallen Titan',
        type: 'boss',
        hp: 900, atk: 90, matk: 45, def: 45, mdef: 34, spd: 8,
        cr_rate: 0.1, cd_mult: 1.5,
        expReward: 500, goldReward: 300,
        region: 'verdant_expanse', sub_region: 'silent_crater',
        drops: [
            { item: 'star_fragment', chance: 1.0, min: 1, max: 2 },
            { item: 'titan_plating', chance: 0.5, min: 1, max: 1 }
        ]
    },
    // Iron Foothills Enemies
    {
        id: 'mountain_wolf',
        name: 'Mountain Wolf',
        type: 'normal',
        hp: 337, atk: 51, matk: 0, def: 17, mdef: 11, spd: 20,
        cr_rate: 0.15, cd_mult: 1.4,
        expReward: 120, goldReward: 60,
        region: 'iron_foothills', sub_region: 'gravel_slopes',
        drops: [
            { item: 'thick_wolf_pelt', chance: 0.5, min: 1, max: 2 },
            { item: 'alpha_wolf_pelt', chance: 0.05, min: 1, max: 1 },
            { item: 'sharp_wolf_fang', chance: 0.4, min: 1, max: 1 },
            { item: 'dire_wolf_fang', chance: 0.1, min: 1, max: 1 }
        ]
    },
    {
        id: 'kobold_scavenger',
        name: 'Kobold Scavenger',
        type: 'normal',
        hp: 315, atk: 56, matk: 11, def: 22, mdef: 17, spd: 18,
        cr_rate: 0.1, cd_mult: 1.3,
        expReward: 140, goldReward: 80,
        region: 'iron_foothills', sub_region: 'hollowed_mines',
        drops: [
            { item: 'candle_stub', chance: 0.3, min: 1, max: 1 },
            { item: 'copper_coin', chance: 0.5, min: 2, max: 5 },
            { item: 'iron_ore', chance: 0.2, min: 1, max: 2 }
        ]
    },
    {
        id: 'steel_feather_harpy',
        name: 'Steel-Feather Harpy',
        type: 'normal',
        hp: 394, atk: 62, matk: 22, def: 20, mdef: 28, spd: 25,
        cr_rate: 0.12, cd_mult: 1.4,
        expReward: 180, goldReward: 90,
        region: 'iron_foothills', sub_region: 'razor_ridges',
        drops: [
            { item: 'steel_feather', chance: 0.5, min: 1, max: 2 }
        ]
    },
    {
        id: 'thunder_clad_golem',
        name: 'Thunder-Clad Golem',
        type: 'boss',
        hp: 1350, atk: 112, matk: 90, def: 67, mdef: 45, spd: 10,
        cr_rate: 0.05, cd_mult: 1.5,
        expReward: 800, goldReward: 500,
        region: 'iron_foothills', sub_region: 'storm_callers_peak',
        drops: [
            { item: 'lightning_core', chance: 1.0, min: 1, max: 1 },
            { item: 'storm_dust', chance: 0.8, min: 3, max: 6 }
        ]
    }
];

module.exports = ENEMIES;