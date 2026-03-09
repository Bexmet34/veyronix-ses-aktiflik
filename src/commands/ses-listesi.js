const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { formatDuration } = require('../utils/timeFormat');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-listesi')
        .setDescription('Tüm kullanıcıların ses aktiflik listesini gösterir (Sadece Kurucu).')
        .addStringOption(option =>
            option.setName('sirala')
                .setDescription('Sıralama türünü seçin.')
                .addChoices(
                    { name: 'En Çok Sese Katılan', value: 'en_cok' },
                    { name: 'En Az Sese Katılan', value: 'en_az' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        // Enforce Server Owner Only
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ Bu komutu sadece sunucu sahibi (**Server Owner**) kullanabilir.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const sorting = interaction.options.getString('sirala') || 'en_cok';

        // Get all voice data
        const allData = await client.db.voice.all();
        const guildUsers = allData
            .filter(d => d.id.startsWith(`${interaction.guild.id}_`))
            .map(d => ({ userId: d.id.split('_')[1], ...d.value }));

        if (guildUsers.length === 0) {
            return interaction.editReply({ content: 'Henüz ses verisi bulunmuyor.' });
        }

        // Sorting
        if (sorting === 'en_cok') {
            guildUsers.sort((a, b) => b.totalTime - a.totalTime);
        } else {
            guildUsers.sort((a, b) => a.totalTime - b.totalTime);
        }

        const totalServerTime = guildUsers.reduce((acc, curr) => acc + curr.totalTime, 0);

        const embed = new EmbedBuilder()
            .setTitle(`📋 Detaylı Ses Aktiflik Listesi`)
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setColor(sorting === 'en_cok' ? 0x2ECC71 : 0xE67E22)
            .addFields(
                { name: '📊 Sıralama Türü', value: sorting === 'en_cok' ? 'En Çok Sese Katılanlar' : 'En Az Sese Katılanlar', inline: true },
                { name: '👥 Toplam Kayıt', value: `${guildUsers.length} Üye`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sadece yetkili/kurucu erişimi.' });

        // Chunking the list to fit in description (max 4096 chars)
        // Each line is roughly 45 chars. 4096 / 45 ≈ 90 lines. 
        // Let's show up to 50 users per embed to be safe and clean.

        let description = "```prolog\n#   Kullanıcı           Süre      Aktiflik\n--------------------------------------------\n";

        const displayLimit = Math.min(guildUsers.length, 50);

        for (let i = 0; i < displayLimit; i++) {
            const u = guildUsers[i];
            const member = await interaction.guild.members.fetch(u.userId).catch(() => null);
            const name = (member ? member.user.username : `User_${u.userId.slice(-4)}`).padEnd(17).slice(0, 17);
            const duration = formatDuration(u.totalTime).padEnd(10);
            const share = totalServerTime > 0 ? ((u.totalTime / totalServerTime) * 100).toFixed(0) : 0;
            const rank = (i + 1).toString().padStart(2, '0');
            description += `${rank}  ${name}  ${duration}  [%${share}]\n`;
        }

        description += "--------------------------------------------\n```";

        if (guildUsers.length > displayLimit) {
            description += `\n*Not: İlk ${displayLimit} kullanıcı listelendi. Toplam ${guildUsers.length} veri var.*`;
        }

        embed.setDescription(description);

        return interaction.editReply({ embeds: [embed] });
    }
};
