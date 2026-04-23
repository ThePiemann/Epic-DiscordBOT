module.exports = {
    // --- BASIC RESOURCES ---
    'wood': {
        id: 'wood', name: 'Wood', description: 'A basic log suitable for crafting.',
        type: 'material', price: 5, sellPrice: 1, stars: 1, family: 'wood',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'stone': {
        id: 'stone', name: 'Stone', description: 'A rough chunk of stone.',
        type: 'material', price: 5, sellPrice: 1, stars: 1, family: 'stone',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'clay': {
        id: 'clay', name: 'Clay', description: 'Soft, malleable earth.',
        type: 'material', price: 5, sellPrice: 2, stars: 1, family: 'clay',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'maple_log': {
        id: 'maple_log', name: 'Maple Log', description: 'High quality wood.',
        type: 'material', price: 20, sellPrice: 5, stars: 2, family: 'wood',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'pine_log': {
        id: 'pine_log', name: 'Pine Log', description: 'Resilient wood from the foothills.',
        type: 'material', price: 25, sellPrice: 8, stars: 2, family: 'wood',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },

    // --- ORES & MINERALS ---
    'iron_ore': {
        id: 'iron_ore', name: 'Iron Ore', type: 'material', price: 15, sellPrice: 5, stars: 1, family: 'iron',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'copper_ore': {
        id: 'copper_ore', name: 'Copper Ore', type: 'material', price: 12, sellPrice: 4, stars: 1, family: 'copper',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'copper_nugget': {
        id: 'copper_nugget', name: 'Copper Nugget', type: 'material', price: 8, sellPrice: 3, stars: 1, family: 'copper',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'silver_ore': {
        id: 'silver_ore', name: 'Silver Ore', type: 'material', price: 50, sellPrice: 20, stars: 2, family: 'silver',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'gold_ore': {
        id: 'gold_ore', name: 'Gold Ore', type: 'material', price: 120, sellPrice: 50, stars: 3, family: 'gold',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'coal': {
        id: 'coal', name: 'Coal', type: 'material', price: 10, sellPrice: 3, stars: 1, family: 'fuel',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'flint': {
        id: 'flint', name: 'Flint', type: 'material', price: 8, sellPrice: 2, stars: 1, family: 'fuel',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'wind_stone': {
        id: 'wind_stone', name: 'Wind Stone', type: 'material', price: 30, sellPrice: 10, stars: 2, family: 'essence',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'slate': {
        id: 'slate', name: 'Slate', type: 'material', price: 10, sellPrice: 3, stars: 1, family: 'stone',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'quartz': {
        id: 'quartz', name: 'Quartz', type: 'material', price: 40, sellPrice: 15, stars: 2, family: 'crystal',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'meteorite_shard': {
        id: 'meteorite_shard', name: 'Meteorite Shard', type: 'material', price: 200, sellPrice: 50, stars: 3, family: 'essence',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'obsidian': {
        id: 'obsidian', name: 'Obsidian', type: 'material', price: 100, sellPrice: 30, stars: 3, family: 'crystal',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'storm_crystal': {
        id: 'storm_crystal', name: 'Storm Crystal', type: 'material', price: 150, sellPrice: 40, stars: 3, family: 'crystal',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'electrum_ore': {
        id: 'electrum_ore', name: 'Electrum Ore', type: 'material', price: 80, sellPrice: 25, stars: 3, family: 'silver',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'diamond': {
        id: 'diamond', name: 'Diamond', type: 'material', price: 1000, sellPrice: 500, stars: 5, family: 'gem',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },
    'ruby_fragment': {
        id: 'ruby_fragment', name: 'Ruby Fragment', type: 'material', price: 150, sellPrice: 60, stars: 3, family: 'gem',
        sellable: true, buyable: false, auctionable: true, tradeable: true
    },

    // --- PLANTS & HERBS ---
    'clover': { id: 'clover', name: 'Clover', type: 'material', price: 5, sellPrice: 1, stars: 1, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'wildflowers': { id: 'wildflowers', name: 'Wildflowers', type: 'material', price: 5, sellPrice: 2, stars: 1, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'herbs': { id: 'herbs', name: 'Herbs', type: 'material', price: 10, sellPrice: 3, stars: 1, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'wheat': { id: 'wheat', name: 'Wheat', type: 'material', price: 6, sellPrice: 2, stars: 1, family: 'food', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'seeds': { id: 'seeds', name: 'Seeds', type: 'material', price: 4, sellPrice: 1, stars: 1, family: 'food', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'cliff_moss': { id: 'cliff_moss', name: 'Cliff Moss', type: 'material', price: 10, sellPrice: 3, stars: 1, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'iron_thistle': { id: 'iron_thistle', name: 'Iron Thistle', type: 'material', price: 15, sellPrice: 5, stars: 1, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'dry_twig': { id: 'dry_twig', name: 'Dry Twig', type: 'material', price: 2, sellPrice: 0, stars: 1, family: 'fuel', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'pine_cone': { id: 'pine_cone', name: 'Pine Cone', type: 'material', price: 3, sellPrice: 1, stars: 1, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'mountain_flower': { id: 'mountain_flower', name: 'Mountain Flower', type: 'material', price: 8, sellPrice: 3, stars: 1, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'mushroom': { id: 'mushroom', name: 'Mushroom', type: 'material', price: 6, sellPrice: 2, stars: 1, family: 'food', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'frost_lichen': { id: 'frost_lichen', name: 'Frost Lichen', type: 'material', price: 20, sellPrice: 6, stars: 2, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'charged_flower': { id: 'charged_flower', name: 'Charged Flower', type: 'material', price: 40, sellPrice: 12, stars: 2, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'scorched_earth': { id: 'scorched_earth', name: 'Scorched Earth', type: 'material', price: 10, sellPrice: 2, stars: 1, family: 'essence', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'desert_bloom': { id: 'desert_bloom', name: 'Desert Bloom', type: 'material', price: 25, sellPrice: 10, stars: 2, family: 'plant', sellable: true, buyable: false, auctionable: true, tradeable: true },
    'golden_wheat': { id: 'golden_wheat', name: 'Golden Wheat', type: 'material', price: 50, sellPrice: 15, stars: 2, family: 'food', sellable: true, buyable: false, auctionable: true, tradeable: true },

    // --- ANIMAL PARTS & DROPS ---
    'goblin_ear': { id: 'goblin_ear', name: 'Goblin Ear', type: 'material', price: 10, sellPrice: 3, stars: 1, family: 'goblin', sellable: true, buyable: false },
    'tough_goblin_ear': { id: 'tough_goblin_ear', name: 'Tough Goblin Ear', type: 'material', price: 30, sellPrice: 10, stars: 2, family: 'goblin', sellable: true, buyable: false },
    'chieftain_ear': { id: 'chieftain_ear', name: 'Chieftain Ear', type: 'material', price: 100, sellPrice: 35, stars: 3, family: 'goblin', sellable: true, buyable: false },
    'slime_gel': { id: 'slime_gel', name: 'Slime Gel', type: 'material', price: 8, sellPrice: 2, stars: 1, family: 'slime', sellable: true, buyable: false },
    'sticky_slime_gel': { id: 'sticky_slime_gel', name: 'Sticky Slime Gel', type: 'material', price: 25, sellPrice: 8, stars: 2, family: 'slime', sellable: true, buyable: false },
    'crystallized_slime': { id: 'crystallized_slime', name: 'Crystallized Slime', type: 'material', price: 80, sellPrice: 25, stars: 3, family: 'slime', sellable: true, buyable: false },
    'wolf_pelt': { id: 'wolf_pelt', name: 'Wolf Pelt', type: 'material', price: 15, sellPrice: 5, stars: 1, family: 'wolf', sellable: true, buyable: false },
    'wolf_fang': { id: 'wolf_fang', name: 'Wolf Fang', type: 'material', price: 12, sellPrice: 4, stars: 1, family: 'wolf', sellable: true, buyable: false },
    'minnow': { id: 'minnow', name: 'Minnow', type: 'material', price: 5, sellPrice: 2, stars: 1, family: 'fish', sellable: true, buyable: false },
    'carp': { id: 'carp', name: 'Carp', type: 'material', price: 15, sellPrice: 5, stars: 1, family: 'fish', sellable: true, buyable: false },
    'golden_koi': { id: 'golden_koi', name: 'Golden Koi', type: 'material', price: 200, sellPrice: 100, stars: 3, family: 'fish', sellable: true, buyable: false },
    'sand_crab': { id: 'sand_crab', name: 'Sand Crab', type: 'material', price: 12, sellPrice: 4, stars: 1, family: 'fish', sellable: true, buyable: false },
    'waste_eel': { id: 'waste_eel', name: 'Waste Eel', type: 'material', price: 30, sellPrice: 10, stars: 2, family: 'fish', sellable: true, buyable: false },
    'old_boot': { id: 'old_boot', name: 'Old Boot', type: 'material', price: 1, sellPrice: 1, stars: 1, family: 'junk', sellable: true, buyable: false },
    'eagle_feather': { id: 'eagle_feather', name: 'Eagle Feather', type: 'material', price: 10, sellPrice: 3, stars: 1, family: 'bird', sellable: true, buyable: false },
    'sky_feather': { id: 'sky_feather', name: 'Sky Feather', type: 'material', price: 40, sellPrice: 12, stars: 2, family: 'bird', sellable: true, buyable: false },
    'eagle_egg': { id: 'eagle_egg', name: 'Eagle Egg', type: 'material', price: 20, sellPrice: 7, stars: 2, family: 'food', sellable: true, buyable: false },
    'broken_wing': { id: 'broken_wing', name: 'Broken Wing', type: 'material', price: 15, sellPrice: 5, stars: 1, family: 'bird', sellable: true, buyable: false },
    'sharp_beak': { id: 'sharp_beak', name: 'Sharp Beak', type: 'material', price: 20, sellPrice: 7, stars: 1, family: 'bird', sellable: true, buyable: false },

    // --- MISC / SEARCH ---
    'shiny_pebble': { id: 'shiny_pebble', name: 'Shiny Pebble', type: 'material', price: 2, sellPrice: 1, stars: 1, family: 'junk', sellable: true, buyable: false },
    'loose_coin': { id: 'loose_coin', name: 'Loose Coin', type: 'material', price: 1, sellPrice: 1, stars: 1, family: 'currency', sellable: true, buyable: false },
    'old_newspaper': { id: 'old_newspaper', name: 'Old Newspaper', type: 'material', price: 1, sellPrice: 0, stars: 1, family: 'junk', sellable: true, buyable: false },
    'bread_crumbs': { id: 'bread_crumbs', name: 'Bread Crumbs', type: 'material', price: 1, sellPrice: 0, stars: 1, family: 'food', sellable: true, buyable: false },
    'lost_pendant': { id: 'lost_pendant', name: 'Lost Pendant', type: 'material', price: 100, sellPrice: 50, stars: 3, family: 'treasure', sellable: true, buyable: false },
    'rusty_nail': { id: 'rusty_nail', name: 'Rusty Nail', type: 'material', price: 1, sellPrice: 0, stars: 1, family: 'junk', sellable: true, buyable: false },
    'glass_shard': { id: 'glass_shard', name: 'Glass Shard', type: 'material', price: 2, sellPrice: 1, stars: 1, family: 'junk', sellable: true, buyable: false },

    // --- RELIC ESSENCES (BUYABLE) ---
    'relic_essence': {
        id: 'relic_essence', name: 'Relic Essence', description: 'Used to enhance relics. Grants 500 Relic XP.',
        type: 'material', price: 2000, sellPrice: 100, stars: 2, family: 'essence',
        sellable: true, buyable: true, auctionable: true, tradeable: true,
        dailyStock: 10
    },
    'sanctifying_essence': {
        id: 'sanctifying_essence', name: 'Sanctifying Essence', description: 'High-quality relic fuel. Grants 2500 Relic XP.',
        type: 'material', price: 6000, sellPrice: 500, stars: 3, family: 'essence',
        sellable: true, buyable: true, auctionable: true, tradeable: true,
        dailyStock: 10
    },
};