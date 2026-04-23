const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Checks all traveling users and completes their travel if they have arrived.
 * @param {import('discord.js').Client} client - The Discord client to send DMs.
 */
async function processTravels(client) {
    if (mongoose.connection.readyState !== 1) return;

    try {
        const now = new Date();
        const travelers = await User.find({
            'travel.isTraveling': true,
            'travel.arrivalDate': { $lte: now }
        });

        for (const user of travelers) {
            const destination = user.travel.destination || user.region;
            
            // Mark travel as complete
            user.travel.isTraveling = false;
            user.travel.arrivalDate = null;
            user.travel.destination = null;
            
            // Default to the Wilds upon arrival at a new region/subregion
            user.currentPlace = null; 
            
            user.markModified('travel');
            await user.save();

            try {
                const discordUser = await client.users.fetch(user.userId);
                if (discordUser) {
                    const destName = destination.replace(/_/g, ' ').toUpperCase();
                    await discordUser.send(`🔔 **Ding!**\nYou have arrived at **${destName}**!\n\nYou are currently in the **Wilds**. Use \`/explore\` to see nearby locations.`);
                }
            } catch (dmError) {
                console.warn(`Could not DM user ${user.userId}:`, dmError.message);
            }
        }
    } catch (error) {
        console.error('Travel Processing Error:', error);
    }
}

module.exports = { processTravels };