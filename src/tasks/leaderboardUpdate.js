const { EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../utils/timeFormat');

/**
 * Updates the leaderboard for a specific guild
 * @param {import('discord.js').Client} client 
 * @param {string} guildId 
 */
async function updateGuildLeaderboard(client, guildId) {
    const config = await client.db.config.get(guildId);
    if (!config || !config.statsChannelId) return;

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(config.statsChannelId) || await guild.channels.fetch(config.statsChannelId).catch(() => null);
        if (!channel) return;

        // Prepare Data
        const allVoiceData = await client.db.voice.all();
        const guildUsers = allVoiceData
            .filter(d => d.id.startsWith(`${guildId}_`))
            .map(d => ({ userId: d.id.split('_')[1], ...d.value }))
            .sort((a, b) => b.totalTime - a.totalTime);

        const top15 = guildUsers.slice(0, 15);
        const totalServerTime = guildUsers.reduce((acc, curr) => acc + curr.totalTime, 0);

        let activeCount = 0;
        guild.channels.cache.filter(c => c.isVoiceBased()).forEach(vc => {
            activeCount += vc.members.filter(m => !m.user.bot).size;
        });

        const winnersText = top15.length > 0 ?
            top15.slice(0, 3).map((u, i) => {
                const emoji = ['🥇', '🥈', '🥉'][i];
                const member = guild.members.cache.get(u.userId);
                const name = member ? member.user.tag : `Bilinmeyen (#${u.userId.slice(-4)})`;
                return `${emoji} **${name}** - \`${formatDuration(u.totalTime)}\``;
            }).join('\n') : "Henüz veri yok.";

        let detailList = "```prolog\n#   Kullanıcı           Süre      Aktiflik Payı\n--------------------------------------------\n";
        top15.forEach((u, i) => {
            const member = guild.members.cache.get(u.userId);
            const name = (member ? member.user.username : `User_${u.userId.slice(-4)}`).padEnd(17).slice(0, 17);
            const duration = formatDuration(u.totalTime).padEnd(10);
            const share = totalServerTime > 0 ? ((u.totalTime / totalServerTime) * 100).toFixed(0) : 0;
            const rank = (i + 1).toString().padStart(2, '0');
            detailList += `${rank}  ${name}  ${duration}  [%${share}]\n`;
        });
        detailList += "--------------------------------------------\n```";
        detailList += "\n[Support](https://discord.gg/RZJE77KEVB) [Website](https://veyronixbot.vercel.app)";

        const embed = new EmbedBuilder()
            .setTitle('📊 Ses Aktivite (Top 15)')
            .setDescription('Turquoise Ses Aktiflik Listesi')
            .setColor(0x3498DB)
            .addFields(
                { name: '👑 Haftalık Zirvedekiler', value: winnersText, inline: false },
                { name: '⏱️ Sunucu Toplamı', value: `\`${Math.floor(totalServerTime / (1000 * 60 * 60))} Saat\``, inline: true },
                { name: '👥 Sesteki Üye', value: `\`${activeCount} Kişi\``, inline: true },
                { name: '📜 Detaylı Kullanıcı Listesi (Puanlama)', value: detailList, inline: false }
            )
            .setFooter({ text: 'Yüzdeler toplam süreye göre hesaplanır.' })
            .setTimestamp();

        if (config.lastMessageId) {
            try {
                const msg = await channel.messages.fetch(config.lastMessageId);
                await msg.edit({ embeds: [embed] });
            } catch (e) {
                const newMsg = await channel.send({ embeds: [embed] });
                config.lastMessageId = newMsg.id;
                await client.db.config.set(guildId, config);
            }
        } else {
            const newMsg = await channel.send({ embeds: [embed] });
            config.lastMessageId = newMsg.id;
            await client.db.config.set(guildId, config);
        }
    } catch (err) {
        console.error(`Error updating leaderboard for guild ${guildId}:`, err);
    }
}

/**
 * Updates ONLY the active user count in the existing embed
 * @param {import('discord.js').Client} client 
 * @param {string} guildId 
 */
async function updateActiveCount(client, guildId) {
    const config = await client.db.config.get(guildId);
    if (!config || !config.statsChannelId || !config.lastMessageId) return;

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(config.statsChannelId) || await guild.channels.fetch(config.statsChannelId).catch(() => null);
        if (!channel) return;

        const message = await channel.messages.fetch(config.lastMessageId).catch(() => null);
        if (!message || !message.embeds[0]) return;

        // Count active users in voice
        let activeCount = 0;
        guild.channels.cache.filter(c => c.isVoiceBased()).forEach(vc => {
            activeCount += vc.members.filter(m => !m.user.bot).size;
        });

        const oldEmbed = message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed);

        // Update the "Sesteki Üye" field (usually index 2 based on previous code)
        // To be safe, we look for it by name
        const fields = [...oldEmbed.fields];
        const activeFieldIdx = fields.findIndex(f => f.name.includes('Sesteki Üye'));

        if (activeFieldIdx !== -1) {
            fields[activeFieldIdx] = { ...fields[activeFieldIdx], value: `\`${activeCount} Kişi\`` };
            newEmbed.setFields(fields);

            // Edit message with updated count
            await message.edit({ embeds: [newEmbed] });
        }

    } catch (err) {
        // Silently fail to avoid console Spam on voice moves
    }
}

/**
 * Starts the leaderboard update loop
 * @param {import('discord.js').Client} client 
 */
function startLeaderboardTask(client) {
    // Run once on startup
    setTimeout(async () => {
        const allConfigs = await client.db.config.all();
        for (const entry of allConfigs) {
            await updateGuildLeaderboard(client, entry.id);
        }
    }, 5000);

    setInterval(async () => {
        const allConfigs = await client.db.config.all();
        for (const entry of allConfigs) {
            await updateGuildLeaderboard(client, entry.id);
        }
    }, 15 * 60 * 1000);
}

module.exports = { startLeaderboardTask, updateGuildLeaderboard, updateActiveCount };
