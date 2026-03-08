const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration, createProgressBar } = require('../utils/timeFormat');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Kişisel ses istatistiklerini gösterir.'),
    async execute(interaction, client) {
        const { guild, user } = interaction;

        // Get all users in guild to calculate rank and total
        const allData = await client.db.voice.all();
        const guildUsers = allData
            .filter(d => d.id.startsWith(`${guild.id}_`))
            .map(d => ({ userId: d.id.split('_')[1], ...d.value }))
            .sort((a, b) => b.totalTime - a.totalTime);

        const totalServerTime = guildUsers.reduce((acc, curr) => acc + curr.totalTime, 0);

        const userData = guildUsers.find(u => u.userId === user.id);
        const rank = guildUsers.findIndex(u => u.userId === user.id) + 1;

        if (!userData || userData.totalTime === 0) {
            return interaction.reply({ content: 'Henüz ses veriniz bulunmuyor.', ephemeral: true });
        }

        const share = totalServerTime > 0 ? ((userData.totalTime / totalServerTime) * 100).toFixed(1) : 0;
        const goalMs = 80 * 60 * 60 * 1000; // 80 Hours
        const remainingMs = Math.max(goalMs - userData.totalTime, 0);
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));

        const embed = new EmbedBuilder()
            .setTitle('👤 Kişisel Ses Profilin')
            .setDescription('Sunucudaki geçici odalarda gösterdiğin aktiflik verileri aşağıda listelenmiştir.')
            .setColor(0xF1C40F) // Gold/Yellow
            .addFields(
                { name: '⌛ Toplam Süren', value: `\`${formatDuration(userData.totalTime)}\``, inline: true },
                { name: '📊 Sunucu Sıralaman', value: `\`${rank}. Sıradasın\``, inline: true },
                { name: '📈 Aktiflik Payın', value: `\`%${share}\` (Sunucu geneli)`, inline: true },
                {
                    name: '🎯 Haftalık Hedef İlerlemesi',
                    value: `\`\`\`prolog\n${createProgressBar(userData.totalTime, goalMs, 20)}\n\`\`\`\n*Hedefin olan 80 saate ulaşmana ${remainingHours} saat kaldı!*`,
                    inline: false
                }
            )
            .setFooter({ text: 'Yüzdeler toplam süreye göre hesaplanır.' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
