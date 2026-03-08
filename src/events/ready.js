const { ActivityType, Events } = require('discord.js');
const { startLeaderboardTask } = require('../tasks/leaderboardUpdate');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}!`);

        client.user.setActivity('Ses Aktifliği', { type: ActivityType.Watching });

        // Recover active sessions: If people are already in voice when bot starts
        for (const [guildId, guild] of client.guilds.cache) {
            const voiceStates = guild.voiceStates.cache;
            const now = new Date().getTime();

            for (const [userId, state] of voiceStates) {
                if (state.member.user.bot) continue;
                if (state.channel) {
                    const userKey = `${guildId}_${userId}`;
                    let userData = await client.db.voice.get(userKey) || {
                        totalTime: 0,
                        weeklyGoal: 288000000,
                        currentJoinTime: null
                    };

                    userData.currentJoinTime = now;
                    await client.db.voice.set(userKey, userData);
                }
            }
        }

        // Initialize Leaderboard Updates
        startLeaderboardTask(client);
    }
};
