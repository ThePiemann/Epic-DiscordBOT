require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, EmbedBuilder, MessageFlags } = require('discord.js');
const mongoose = require('mongoose');
const glob = require('glob');
const path = require('path');
const User = require('./models/User');
const connectDB = require('./database');

const { processTravels } = require('./systems/travel');
const { processExpiredAuctions } = require('./systems/auction');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- GLOBAL ERROR HANDLING ---
client.on('error', error => {
    console.error('Discord Client Error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled Promise Rejection:', error);
});

client.commands = new Collection();

const commandsArray = [];
const commandFiles = glob.sync('./src/commands/**/*.js');

for (const file of commandFiles) {
    const command = require(path.resolve(file));

    if (!command.data || !command.execute) {
        console.warn(`⚠️  [SKIPPING] ${file} - Missing "data" or "execute" property.`);
        continue; 
    }

    client.commands.set(command.data.name, command);
    commandsArray.push(command.data.toJSON());
}

const start = async () => {
    try {
        await connectDB();
        
        setInterval(async () => {
            await processTravels(client);
            await processExpiredAuctions(client);
        }, 60 * 1000); 

        await client.login(process.env.DISCORD_TOKEN);
    } catch (err) {
        console.error('Failed to start the bot:', err);
    }
};

client.once(Events.ClientReady, async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandsArray },
        );
        console.log('✅ Slash Commands Registered');
    } catch (error) {
        console.error(error);
    }
});

const userCooldowns = new Map();
const COOLDOWN_SECONDS = 1.2; // Slightly reduced for better feel

client.on('interactionCreate', async interaction => {
    try {
        // Rate Limiting (Ignore Autocomplete)
        if (!interaction.isAutocomplete()) {
            const now = Date.now();
            const lastUsed = userCooldowns.get(interaction.user.id) || 0;
            if (now - lastUsed < COOLDOWN_SECONDS * 1000) {
                const timeLeft = (COOLDOWN_SECONDS - (now - lastUsed) / 1000).toFixed(1);
                // Wrap in try-catch to prevent "Unknown Interaction" crashes
                try {
                    return await interaction.reply({ 
                        content: `⏳ Slow down! Please wait **${timeLeft}s** before the next action.`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } catch (e) {
                    return; // Ignore if interaction is already invalid
                }
            }
            userCooldowns.set(interaction.user.id, now);
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            
            // Interaction validity check
            if (Date.now() - interaction.createdTimestamp > 3000) {
                console.warn(`⚠️ [Interaction] Command /${interaction.commandName} expired before execution.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (execError) {
                console.error(`❌ [Command Error] /${interaction.commandName}:`, execError);
                throw execError; // Rethrow to be caught by the outer catch
            }
        } 
        else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // Interaction validity check for autocomplete (3s limit)
            if (Date.now() - interaction.createdTimestamp > 2000) {
                return; // Silently drop expired autocompletes
            }

            try {
                if (command.autocomplete) await command.autocomplete(interaction);
            } catch (autoError) {
                // Autocomplete errors are usually silent to the user
                console.error(`❌ [Autocomplete Error] /${interaction.commandName}:`, autoError);
            }
        }
        else if (interaction.customId) {
            const [commandName, action, ...args] = interaction.customId.split(':');
            const command = client.commands.get(commandName);

            if (!command) return;

            // Interaction validity check for components
            if (Date.now() - interaction.createdTimestamp > 3000) {
                return console.warn(`⚠️ [Interaction] Component ${interaction.customId} expired.`);
            }

            try {
                if (interaction.isButton() && command.handleButton) {
                    await command.handleButton(interaction, action, args);
                } 
                else if (interaction.isStringSelectMenu() && command.handleSelectMenu) {
                    await command.handleSelectMenu(interaction, action, args);
                } 
                else if (interaction.isModalSubmit() && command.handleModal) {
                    await command.handleModal(interaction, action, args);
                }
                else {
                    await command.execute(interaction);
                }
            } catch (compError) {
                console.error(`❌ [Component Error] ${interaction.customId}:`, compError);
                throw compError;
            }
        }
    } catch (error) {
        console.error('Interaction Error:', error);
        
        if (interaction.isAutocomplete()) return;

        const errorMessage = {
            content: 'There was an error executing this interaction!',
            flags: [MessageFlags.Ephemeral]
        };
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorMessage).catch(() => {});
            } else {
                await interaction.followUp(errorMessage).catch(() => {});
            }
        } catch (e) {}
    }
});

start();