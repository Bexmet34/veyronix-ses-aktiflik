const { Events } = require('discord.js');
const { updateActiveCount } = require('../tasks/leaderboardUpdate');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        const { member, guild } = newState;
        if (member.user.bot) return;

        const config = await client.db.config.get(guild.id) || {
            ignoredChannels: [],
            countMutedDeaf: true
        };

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // Check if channel is ignored
        const isIgnored = (channel) => channel && config.ignoredChannels.includes(channel.id);
        const isValidChannel = (channel) => channel && !isIgnored(channel);

        // Check Mute/Deaf if config says so
        const isMuted = (state) => !config.countMutedDeaf && (state.selfMute || state.selfDeaf || state.serverMute || state.serverDeaf);

        const wasValidSession = isValidChannel(oldChannel) && !isMuted(oldState);
        const isValidSession = isValidChannel(newChannel) && !isMuted(newState);

        const userKey = `${guild.id}_${member.id}`;
        let userData = await client.db.voice.get(userKey) || {
            totalTime: 0,
            weeklyGoal: 288000000,
            currentJoinTime: null
        };

        const now = new Date().getTime();

        // SCENARIO 1: Just joined a valid session (or unmuted while in channel)
        if (!wasValidSession && isValidSession) {
            userData.currentJoinTime = now;
            await client.db.voice.set(userKey, userData);
        }
        // SCENARIO 2: Just left a valid session (or muted while in channel)
        else if (wasValidSession && !isValidSession) {
            if (userData.currentJoinTime) {
                const timeDiff = now - userData.currentJoinTime;
                userData.totalTime = (userData.totalTime || 0) + timeDiff;
                userData.currentJoinTime = null;
                await client.db.voice.set(userKey, userData);
            }
        }
        // Update active count in embed immediately
        if (oldChannel?.id !== newChannel?.id) {
            updateActiveCount(client, guild.id);
        }
    }
};
