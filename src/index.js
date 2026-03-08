require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { QuickDB } = require('quick.db');
const fs = require('fs');
const path = require('path');

// Initialize Local Database
const db = new QuickDB();
// Tables
const configTable = db.table('config');
const voiceTable = db.table('voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.db = {
    config: configTable,
    voice: voiceTable
};

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commandsJSON = [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsJSON.push(command.data.toJSON());
    }
}

// Register Slash Commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // This clears and updates GLOBAL commands
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandsJSON },
        );

        // If you see old commands, they might be GUILD-specific from old tests.
        // You can clear them by uncommenting and running this once for each guild:
        /*
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: [] } // Clear guild-specific commands
            );
        }
        */

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Handle process exit to save current active sessions
async function saveAllSessions() {
    console.log('Bot shutting down, saving all active sessions...');
    const now = new Date().getTime();
    const allVoiceData = await voiceTable.all();

    let count = 0;
    for (const entry of allVoiceData) {
        const userData = entry.value;
        if (userData.currentJoinTime) {
            const timeDiff = now - userData.currentJoinTime;
            userData.totalTime = (userData.totalTime || 0) + timeDiff;
            userData.currentJoinTime = null;
            await voiceTable.set(entry.id, userData);
            count++;
        }
    }
    console.log(`Saved ${count} active sessions.`);
}

process.on('SIGINT', async () => {
    await saveAllSessions();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await saveAllSessions();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
