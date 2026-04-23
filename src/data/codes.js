// Define your active codes here.
// Keys must be UPPERCASE (the command will automatically convert user input to uppercase).

module.exports = {
    // Type: 'gold' - Gives gold
    'WELCOME': { 
        type: 'gold', 
        amount: 500 
    },

    // Type: 'item' - Gives an item (must match ID in shopItems or item database)
    'STARTERPACK': { 
        type: 'item', 
        itemId: 'small_potion', 
        amount: 5 
    },

    // Type: 'xp' - Gives experience points
    'LEVELBOOST': { 
        type: 'xp', 
        amount: 100 
    },

    // You can add more codes here simply by adding a new line
    'BETA': {
        type: 'gold',
        amount: 1000
    }
};