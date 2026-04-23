module.exports = {
    // --- RESTORATIVE POTIONS ---
    'small_potion': {
        id: 'small_potion',
        name: 'Small Health Potion',
        description: 'Restores 50 HP upon consumption.',
        price: 20,
        sellPrice: 10,
        type: 'consumable',
        effect: { hp_restore: 50 },
        buyable: true,
        sellable: true,
        brewable: true,
        recipe: { 'wildflowers': 3 },
        tradeable: true,
    },
    'medium_potion': {
        id: 'medium_potion',
        name: 'Medium Health Potion',
        description: 'Restores 150 HP upon consumption.',
        price: 100,
        sellPrice: 50,
        type: 'consumable',
        effect: { hp_restore: 150 },
        buyable: true,
        sellable: true,
        brewable: true,
        recipe: { 'iron_thistle': 2, 'slime_gel': 1 },
        tradeable: true,
    },
    'mana_vial': {
        id: 'mana_vial',
        name: 'Mana Vial',
        description: 'Restores 30 Mana upon consumption.',
        price: 25,
        sellPrice: 12,
        type: 'consumable',
        effect: { mana_restore: 30 },
        buyable: true,
        sellable: true,
        brewable: true,
        recipe: { 'clover': 3 },
        tradeable: true,
    },
    'stamina_pill': {
        id: 'stamina_pill',
        name: 'Stamina Pill',
        description: 'Restores 20 Stamina.',
        price: 15,
        sellPrice: 7,
        type: 'consumable',
        effect: { stamina_restore: 20 },
        buyable: true,
        sellable: true,
        craftable: false,
        tradeable: true,
    },

    // --- ALCHEMY (BUFF POTIONS) ---
    'strength_elixir': {
        id: 'strength_elixir',
        name: 'Strength Elixir',
        description: 'Increases ATK by 15% for 3 battles.',
        price: 500,
        sellPrice: 150,
        type: 'consumable',
        effect: { 
            buff: { id: 'str_buff', name: 'Strength', stat: 'atk', value: 0.15, type: 'percent', durationBattles: 3 }
        },
        buyable: true,
        sellable: true,
        brewable: true,
        recipe: { 'iron_thistle': 3, 'wolf_fang': 1 },
        tradeable: true
    },
    'iron_skin_tonic': {
        id: 'iron_skin_tonic',
        name: 'Iron Skin Tonic',
        description: 'Increases DEF by 15% for 3 battles.',
        price: 500,
        sellPrice: 150,
        type: 'consumable',
        effect: { 
            buff: { id: 'def_buff', name: 'Iron Skin', stat: 'def', value: 0.15, type: 'percent', durationBattles: 3 }
        },
        buyable: true,
        sellable: true,
        brewable: true,
        recipe: { 'iron_ore': 2, 'stone': 5 },
        tradeable: true
    },
    'focus_brew': {
        id: 'focus_brew',
        name: 'Focus Brew',
        description: 'Increases MATK by 15% for 3 battles.',
        price: 500,
        sellPrice: 150,
        type: 'consumable',
        effect: { 
            buff: { id: 'matk_buff', name: 'Focused', stat: 'matk', value: 0.15, type: 'percent', durationBattles: 3 }
        },
        buyable: true,
        sellable: true,
        brewable: true,
        recipe: { 'wildflowers': 5, 'sticky_slime_gel': 1 },
        tradeable: true
    },

    // --- COOKING (FOOD) ---
    'steamed_minnow': {
        id: 'steamed_minnow',
        name: 'Steamed Minnow',
        description: 'A light snack. Grants HP Regen for 30 minutes.',
        price: 150,
        sellPrice: 40,
        type: 'consumable',
        effect: { 
            buff: { id: 'food_regen', name: 'Well Fed', stat: 'hp_regen', value: 5, type: 'flat', expiresAt: 30 * 60 * 1000 } // 30 mins
        },
        buyable: false,
        sellable: true,
        cookable: true,
        recipe: { 'minnow': 2, 'dry_twig': 1 },
        tradeable: true
    },
    'hearty_stew': {
        id: 'hearty_stew',
        name: 'Hearty Stew',
        description: 'A filling meal. Increases Max HP by 10% for 1 hour.',
        price: 400,
        sellPrice: 100,
        type: 'consumable',
        effect: { 
            buff: { id: 'food_hp', name: 'Hearty', stat: 'hp', value: 0.10, type: 'percent', expiresAt: 60 * 60 * 1000 } // 1 hour
        },
        buyable: false,
        sellable: true,
        cookable: true,
        recipe: { 'wheat': 3, 'mushroom': 2, 'dry_twig': 2 },
        tradeable: true
    }
};