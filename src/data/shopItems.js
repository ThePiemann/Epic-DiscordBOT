const { SHOP_TOOLS, TOOLS } = require('./tools'); 
const ARMOR_ITEMS = require('./armor'); 
const WEAPON_ITEMS = require('./weapon'); 
// 🔑 Import the new consumables file
const CONSUMABLES_DATA = require('./consumables'); 
const MATERIALS_DATA = require('./materials');

// Convert the consumables object to an array
const CONSUMABLES_ARRAY = Object.values(CONSUMABLES_DATA);
const MATERIALS_ARRAY = Object.values(MATERIALS_DATA);

const ALL_ARMOR_ARRAY = Object.values(ARMOR_ITEMS);
const ALL_WEAPON_ARRAY = Object.values(WEAPON_ITEMS); 

// The Master Item List contains ALL items
const MASTER_ITEM_LIST = [
    ...CONSUMABLES_ARRAY,
    ...MATERIALS_ARRAY,
    ...ALL_ARMOR_ARRAY,
    ...ALL_WEAPON_ARRAY,
    ...TOOLS 
];

// 🚀 O(1) Lookup Map for efficiency
const MASTER_ITEM_MAP = {};
MASTER_ITEM_LIST.forEach(item => {
    MASTER_ITEM_MAP[item.id] = item;
});

// Create the shop list (Items with buyable: true)
const SHOP_ITEMS_BUYABLE = MASTER_ITEM_LIST.filter(item => item.buyable === true);

module.exports = {
    MASTER_ITEM_LIST, 
    MASTER_ITEM_MAP,
    SHOP_ITEMS: SHOP_ITEMS_BUYABLE 
};