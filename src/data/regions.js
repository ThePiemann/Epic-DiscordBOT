// src/data/regions.js

const REGIONS = {
    'verdant_expanse': {
        name: 'The Verdant Expanse',
        description: 'A vast, sun-drenched grassland that stretches to the horizon.',
        enterMessage: 'You step out into the Verdant Expanse. An endless ocean of green grass ripples in the wind, smelling of fresh soil and wildflowers. The path ahead is open.',
        levelRange: [1, 20],
        difficulty: 'Variable',
        requirements: { level: 1 },
        bossGate: 'star_fallen_titan', // Must defeat to leave
        subRegions: [
            {
                id: 'gentle_meads',
                name: 'The Gentle Meads',
                description: 'The hills here are low and rolling, covered in soft clover. The dirt path is well-worn by many travelers. It is quiet here, save for the chirping of crickets and the rustle of small, harmless creatures.',
                vibe: 'Safe, Soft, Beginner',
                encounterPrompt: 'A round, blue Slime wobbles onto the path ahead. It doesn\'t seem to notice you.',
                dangerLevel: 1,
                enemies: ['slime'],
                places: [
                    {
                        id: 'oakhaven_village',
                        name: 'Oakhaven Village',
                        type: 'town',
                        description: 'A peaceful settlement of wooden cottages.',
                        features: ['shop', 'inn', 'blacksmith', 'carriage', 'training'] 
                    },
                    {
                        id: 'slime_grotto',
                        name: 'Slime Grotto',
                        type: 'dungeon',
                        description: 'A damp cave smelling of mildew and sugar.',
                        features: ['combat', 'mining', 'boss'],
                        enemy_pool: ['slime'],
                        waves: 3
                    },
                    {
                        id: 'forgotten_shrine',
                        name: 'Forgotten Shrine',
                        type: 'landmark',
                        description: 'An ancient, overgrown stone structure dedicated to a lost deity.',
                        features: ['rest', 'blessing']
                    }
                ],
                resources: {
                    mine: [
                        { item: 'stone', min: 1, max: 3, chance: 0.8 },
                        { item: 'clay', min: 1, max: 2, chance: 0.4 },
                        { item: 'copper_nugget', min: 1, max: 1, chance: 0.1 }
                    ],
                    forage: [
                        { item: 'clover', min: 2, max: 5, chance: 0.9 },
                        { item: 'wildflowers', min: 1, max: 3, chance: 0.5 },
                        { item: 'herbs', min: 1, max: 2, chance: 0.3 }
                    ],
                    chop: [
                        { item: 'wood', min: 2, max: 5, chance: 0.8 },
                        { item: 'dry_twig', min: 1, max: 3, chance: 0.4 }
                    ],
                    search: [
                        { item: 'shiny_pebble', min: 1, max: 1, chance: 0.2 },
                        { item: 'old_boot', min: 1, max: 1, chance: 0.05 },
                        { item: 'rusty_nail', min: 1, max: 3, chance: 0.4 },
                        { item: 'glass_shard', min: 1, max: 2, chance: 0.3 }
                    ],
                    fish: [
                        { item: 'minnow', min: 1, max: 3, chance: 0.7 }
                    ]
                },
                // Mini-map coordinates for /location
                map: [
                    "═══╡ GENTLE MEADS ╞═══",
                    "   [Shrine]          ",
                    "      ║              ",
                    "  [Village]══[Grotto]",
                    "      ║              ",
                    "   (You are here)    ",
                    "══════════════════════"
                ]
            },
            {
                id: 'golden_harvest_fields',
                name: 'Golden-Harvest Fields',
                description: 'The grass grows tall and turns to gold here. You are surrounded by acres of wheat ready for harvest. You can see the silhouette of a windmill in the distance and hear the faint sound of farmers working.',
                vibe: 'Agriculture, Civilization, Busy',
                encounterPrompt: 'The wheat stalks rustle violently near your feet. Something is hiding in the crops.',
                dangerLevel: 3,
                enemies: ['scarecrow', 'field_mouse', 'crow', 'harvest_golem'],
                places: [
                    {
                        id: 'solaris_capital',
                        name: 'Solaris Capital',
                        type: 'city',
                        description: 'The grand capital of the Verdant Expanse, built with golden stone.',
                        features: ['shop', 'inn', 'blacksmith', 'carriage', 'guild', 'auction', 'alchemy', 'library']
                    },
                    {
                        id: 'old_windmill',
                        name: 'The Old Windmill',
                        type: 'landmark',
                        description: 'A creaking windmill that still grinds grain for the capital.',
                        features: ['shop', 'rest']
                    },
                    {
                        id: 'whispering_grove',
                        name: 'Whispering Grove',
                        type: 'wilderness',
                        description: 'A small cluster of trees where the wind sounds like voices.',
                        features: ['forage', 'search', 'chop', 'mystery']
                    }
                ],
                resources: {
                    mine: [
                        { item: 'stone', min: 1, max: 3, chance: 0.6 }
                    ],
                    forage: [
                        { item: 'wheat', min: 3, max: 8, chance: 0.9 },
                        { item: 'seeds', min: 2, max: 5, chance: 0.6 },
                        { item: 'golden_wheat', min: 1, max: 1, chance: 0.05 }
                    ],
                    chop: [
                        { item: 'wood', min: 3, max: 6, chance: 0.8 },
                        { item: 'maple_log', min: 1, max: 2, chance: 0.15 }
                    ],
                    search: [
                        { item: 'loose_coin', min: 1, max: 5, chance: 0.3 },
                        { item: 'old_newspaper', min: 1, max: 1, chance: 0.2 },
                        { item: 'rusty_nail', min: 1, max: 3, chance: 0.4 },
                        { item: 'bread_crumbs', min: 1, max: 2, chance: 0.3 }
                    ],
                    fish: [
                        { item: 'carp', min: 1, max: 2, chance: 0.5 },
                        { item: 'golden_koi', min: 1, max: 1, chance: 0.02 }
                    ]
                },
                map: [
                    "══╡ HARVEST FIELDS ╞══",
                    "   [Grove]           ",
                    "      ║              ",
                    " [Windmill]══[CAPITAL]",
                    "      ║              ",
                    "   (You are here)    ",
                    "══════════════════════"
                ]
            },
            {
                id: 'gale_force_bluffs',
                name: 'Gale-Force Bluffs',
                description: 'The terrain rises sharply into jagged cliffs. The wind picks up speed here, whistling loudly through the rock formations. The air feels thinner, and you have a clear view of the lands below.',
                vibe: 'Windy, High up, Vertical',
                encounterPrompt: 'A shadow passes over you. A Harpy screeches from atop a rock pillar.',
                dangerLevel: 6,
                enemies: ['harpy', 'wind_elemental', 'cliff_stalker'],
                places: [
                    {
                        id: 'highwind_outpost',
                        name: 'Highwind Outpost',
                        type: 'town',
                        description: 'A fortified outpost clinging to the side of the bluffs.',
                        features: ['shop', 'inn', 'carriage', 'gliding']
                    },
                    {
                        id: 'wyverns_nest',
                        name: "The Wyvern's Nest",
                        type: 'dungeon',
                        description: 'A series of high-altitude caves where wyverns are known to roost.',
                        features: ['combat', 'boss', 'rare_materials'],
                        enemy_pool: ['harpy', 'wind_elemental'],
                        waves: 5
                    },
                    {
                        id: 'zephyr_monastery',
                        name: 'Zephyr Monastery',
                        type: 'landmark',
                        description: 'A secluded monastery where monks study the path of the wind.',
                        features: ['training', 'rest', 'meditation']
                    }
                ],
                resources: {
                    mine: [
                        { item: 'wind_stone', min: 1, max: 2, chance: 0.4 },
                        { item: 'iron_ore', min: 1, max: 3, chance: 0.3 },
                        { item: 'silver_ore', min: 1, max: 1, chance: 0.1 }
                    ],
                    forage: [
                        { item: 'eagle_feather', min: 1, max: 2, chance: 0.3 },
                        { item: 'cliff_moss', min: 1, max: 3, chance: 0.5 },
                        { item: 'sky_feather', min: 1, max: 1, chance: 0.05 }
                    ],
                    search: [
                        { item: 'broken_wing', min: 1, max: 1, chance: 0.1 },
                        { item: 'sharp_beak', min: 1, max: 1, chance: 0.05 },
                        { item: 'lost_pendant', min: 1, max: 1, chance: 0.02 }
                    ],
                    fish: []
                },
                map: [
                    "══╡ GALE-FORCE BLUFFS ╞══",
                    "   [Monastery]           ",
                    "        ║                ",
                    " [Outpost]═══[Wyvern Nest]",
                    "        ║                ",
                    "    (You are here)       ",
                    "═════════════════════════"
                ]
            },
            {
                id: 'iron_thistle_waste',
                name: 'The Iron-Thistle Waste',
                description: 'The lush green fades into dry, grey scrubland. The ground is hard and cracked, dotted with sharp briar bushes and grey rocks. It is a rugged place where only the toughest plants survive.',
                vibe: 'Dry, Rough, Hardy',
                encounterPrompt: 'A pile of rocks begins to move. It\'s a Stone Golem blocking the way.',
                dangerLevel: 10,
                enemies: ['stone_golem', 'thorn_beast', 'waste_marauder'],
                places: [
                    {
                        id: 'ironhold_citadel',
                        name: 'Ironhold Citadel',
                        type: 'city',
                        description: 'A massive fortress city built to withstand the harsh wastes.',
                        features: ['shop', 'inn', 'blacksmith', 'carriage', 'guild', 'arena', 'mining_guild']
                    },
                    {
                        id: 'scorched_ruins',
                        name: 'The Scorched Ruins',
                        type: 'dungeon',
                        description: 'Remnants of a civilization destroyed by some ancient cataclysm.',
                        features: ['combat', 'search', 'mystery'],
                        enemy_pool: ['stone_golem', 'waste_marauder'],
                        waves: 4
                    },
                    {
                        id: 'oasis_of_resilience',
                        name: 'Oasis of Resilience',
                        type: 'landmark',
                        description: 'A tiny, hidden pocket of life in the middle of the waste.',
                        features: ['rest', 'fish', 'forage']
                    }
                ],
                resources: {
                    mine: [
                        { item: 'iron_ore', min: 2, max: 5, chance: 0.7 },
                        { item: 'flint', min: 1, max: 3, chance: 0.5 },
                        { item: 'ruby_fragment', min: 1, max: 1, chance: 0.03 }
                    ],
                    forage: [
                        { item: 'iron_thistle', min: 1, max: 3, chance: 0.6 },
                        { item: 'dry_twig', min: 1, max: 4, chance: 0.8 },
                        { item: 'desert_bloom', min: 1, max: 1, chance: 0.1 }
                    ],
                    fish: [
                        { item: 'sand_crab', min: 1, max: 2, chance: 0.3 },
                        { item: 'waste_eel', min: 1, max: 1, chance: 0.1 }
                    ]
                },
                map: [
                    "══╡ IRON-THISTLE WASTE ╞══",
                    "   [Oasis]                ",
                    "      ║                   ",
                    " [Ruins]════[CITADEL]     ",
                    "      ║                   ",
                    "   (You are here)         ",
                    "══════════════════════════"
                ]
            },
            {
                id: 'silent_crater',
                name: 'The Silent Crater',
                description: 'The landscape dips suddenly into a massive bowl-shaped depression. The wind stops. The birds stop singing. An unnatural silence hangs over this place, and the center of the crater looks scorched.',
                vibe: 'Mysterious, Ominous, Boss Arena',
                encounterPrompt: 'The ground shakes. The Star-Fallen Titan rises from the center of the crater.',
                dangerLevel: 15,
                enemies: ['star_fallen_titan'],
                resources: {
                    mine: [
                        { item: 'meteorite_shard', min: 1, max: 2, chance: 0.3 },
                        { item: 'obsidian', min: 1, max: 3, chance: 0.5 }
                    ],
                    forage: [
                        { item: 'scorched_earth', min: 1, max: 1, chance: 0.2 }
                    ],
                    fish: []
                },
                map: [
                    "══╡ THE SILENT CRATER ╞══",
                    "                         ",
                    "      [CRATER CENTER]    ",
                    "             ║           ",
                    "       (You are here)    ",
                    "                         ",
                    "═════════════════════════"
                ]
            }
        ],
        connections: ['iron_foothills']
    },
    'iron_foothills': {
        name: 'The Iron Foothills',
        description: 'A rugged landscape of grey rock and pine trees leading up to the great mountains.',
        enterMessage: 'The soft grass ends abruptly, replaced by loose gravel and slate. The air grows colder and thinner. Looming ahead are the jagged silhouettes of the mountains, their peaks hidden in grey clouds.',
        levelRange: [20, 40],
        difficulty: 'Hard',
        requirements: { level: 20 },
        bossGate: 'thunder_clad_golem',
        subRegions: [
            {
                id: 'gravel_slopes',
                name: 'The Gravel Slopes',
                description: 'A steep, winding trail cut into the mountainside. Every step sends a cascade of small stones rattling down the slope. Hardy pine trees cling to the rock face at odd angles.',
                vibe: 'The ascent. Hiking, wild animals, loose footing.',
                encounterPrompt: 'A low growl echoes from behind a boulder. A Mountain Wolf is stalking you.',
                dangerLevel: 20,
                enemies: ['mountain_wolf'],
                resources: {
                    mine: [
                        { item: 'slate', min: 2, max: 5, chance: 0.8 },
                        { item: 'copper_ore', min: 1, max: 3, chance: 0.3 }
                    ],
                    forage: [
                        { item: 'pine_cone', min: 1, max: 3, chance: 0.7 },
                        { item: 'mountain_flower', min: 1, max: 2, chance: 0.4 }
                    ],
                    chop: [
                        { item: 'pine_log', min: 2, max: 4, chance: 0.7 },
                        { item: 'dry_twig', min: 2, max: 5, chance: 0.5 }
                    ],
                    fish: []
                },
                map: [
                    "══╡ THE GRAVEL SLOPES ╞══",
                    "                         ",
                    "      [Summit Path]      ",
                    "             ║           ",
                    "       (You are here)    ",
                    "                         ",
                    "═════════════════════════"
                ]
            },
            {
                id: 'hollowed_mines',
                name: 'The Hollowed Mines',
                description: 'The mouth of a man-made tunnel gapes open here. Old wooden beams support the ceiling, and rusty minecart tracks disappear into the dark. The sound of metal striking stone echoes from deep within.',
                vibe: 'Industry, darkness, cramped combat.',
                encounterPrompt: 'You see the flicker of a torch around the corner. A Kobold Scavenger is protecting his pile of ore.',
                dangerLevel: 25,
                enemies: ['kobold_scavenger'],
                resources: {
                    mine: [
                        { item: 'iron_ore', min: 2, max: 6, chance: 0.9 },
                        { item: 'silver_ore', min: 1, max: 2, chance: 0.2 },
                        { item: 'coal', min: 3, max: 8, chance: 0.7 }
                    ],
                    forage: [
                        { item: 'mushroom', min: 1, max: 4, chance: 0.6 }
                    ],
                    fish: []
                },
                map: [
                    "══╡ THE HOLLOWED MINES ╞══",
                    "                         ",
                    "      [Lower Shafts]     ",
                    "             ║           ",
                    "       (You are here)    ",
                    "                         ",
                    "═════════════════════════"
                ]
            },
            {
                id: 'razor_ridges',
                name: 'The Razor Ridges',
                description: 'The path narrows into a terrifyingly thin ridge connecting two cliffs. The wind howls violently here, tugging at your clothes. To your left and right, there is nothing but a deadly drop into the mist below.',
                vibe: 'High altitude, wind, aerial enemies.',
                encounterPrompt: 'A screech pierces the wind. A shadow dives from the clouds above—a Steel-Feather Harpy.',
                dangerLevel: 30,
                enemies: ['steel_feather_harpy'],
                resources: {
                    mine: [
                        { item: 'quartz', min: 1, max: 3, chance: 0.5 }
                    ],
                    forage: [
                        { item: 'eagle_egg', min: 1, max: 1, chance: 0.1 },
                        { item: 'frost_lichen', min: 1, max: 3, chance: 0.6 }
                    ],
                    fish: []
                },
                map: [
                    "══╡ THE RAZOR RIDGES ╞══",
                    "                        ",
                    "      [Cloud Bridge]    ",
                    "             ║          ",
                    "       (You are here)   ",
                    "                        ",
                    "════════════════════════"
                ]
            },
            {
                id: 'storm_callers_peak',
                name: 'The Storm-Caller’s Peak',
                description: 'You reach a flat, open plateau at the very top of the foothills. The sky is dark and heavy here. Static electricity makes the hair on your arms stand up. The smell of ozone is overwhelming.',
                vibe: 'Boss Arena, elemental weather (Lightning).',
                encounterPrompt: 'A lightning bolt strikes the center of the plateau, leaving a scorch mark. From the smoke, the Thunder-Clad Golem steps forward.',
                dangerLevel: 35,
                enemies: ['thunder_clad_golem'],
                resources: {
                    mine: [
                        { item: 'storm_crystal', min: 1, max: 2, chance: 0.4 },
                        { item: 'electrum_ore', min: 1, max: 3, chance: 0.3 }
                    ],
                    forage: [
                        { item: 'charged_flower', min: 1, max: 1, chance: 0.2 }
                    ],
                    fish: []
                },
                map: [
                    "══╡ STORM-CALLER PEAK ╞══",
                    "                         ",
                    "      [Altar of Thunder] ",
                    "             ║           ",
                    "       (You are here)    ",
                    "                         ",
                    "═════════════════════════"
                ]
            }
        ],
        connections: ['verdant_expanse']
    }
};

module.exports = REGIONS;