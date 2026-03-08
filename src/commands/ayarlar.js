const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateGuildLeaderboard } = require('../tasks/leaderboardUpdate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayarlar')
        .setDescription('Bot ayarlarını yapılandırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('istatistik-kanal')
                .setDescription('Sıralama listesinin paylaşılacağı kanal.')
                .addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option =>
            option.setName('yok-sayilan-kanal')
                .setDescription('Süre sayılmayacak kanalı ekle veya çıkar.')
                .addChannelTypes(ChannelType.GuildVoice))
        .addStringOption(option =>
            option.setName('yok-sayilan-islem')
                .setDescription('Kanala yapılacak işlem.')
                .addChoices(
                    { name: 'Ekle', value: 'add' },
                    { name: 'Çıkar', value: 'remove' }
                ))
        .addStringOption(option =>
            option.setName('güncelleme-aralığı')
                .setDescription('Listenin ne sıklıkla yenileneceği.')
                .addChoices(
                    { name: '6 Saat', value: '6h' },
                    { name: '1 Gün', value: '1d' },
                    { name: '7 Gün', value: '7d' }
                ))
        .addBooleanOption(option =>
            option.setName('susturulmuşlari-say')
                .setDescription('Susturulmuş veya sağırlaştırılmış kullanıcıların süresi sayılsın mı?')),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const statsChannel = interaction.options.getChannel('istatistik-kanal');
        const interval = interaction.options.getString('güncelleme-aralığı');
        const countMuted = interaction.options.getBoolean('susturulmuşlari-say');
        const ignoredChan = interaction.options.getChannel('yok-sayilan-kanal');
        const action = interaction.options.getString('yok-sayilan-islem');

        let config = await client.db.config.get(guildId) || {
            guildId: guildId,
            statsChannelId: null,
            ignoredChannels: [],
            updateInterval: '1d',
            lastMessageId: null,
            countMutedDeaf: true
        };

        let changes = [];
        if (statsChannel) {
            config.statsChannelId = statsChannel.id;
            changes.push(`İstatistik kanalı: <#${statsChannel.id}>`);
        }
        if (interval) {
            config.updateInterval = interval;
            changes.push(`Güncelleme aralığı: \`${interval}\``);
        }
        if (countMuted !== null) {
            config.countMutedDeaf = countMuted;
            changes.push(`Susturulmuşları say: \`${countMuted ? 'Evet' : 'Hayır'}\``);
        }
        if (ignoredChan && action) {
            if (action === 'add') {
                if (!config.ignoredChannels.includes(ignoredChan.id)) {
                    config.ignoredChannels.push(ignoredChan.id);
                    changes.push(`Yoksayılan kanallara eklendi: <#${ignoredChan.id}>`);
                }
            } else {
                config.ignoredChannels = config.ignoredChannels.filter(id => id !== ignoredChan.id);
                changes.push(`Yoksayılan kanallardan çıkarıldı: <#${ignoredChan.id}>`);
            }
        }

        await client.db.config.set(guildId, config);

        if (changes.length === 0) {
            return interaction.reply({ content: 'Herhangi bir değişiklik yapmadınız.', ephemeral: true });
        }

        // Trigger immediate leaderboard update if channel was set
        if (statsChannel) {
            await updateGuildLeaderboard(client, guildId);
        }

        return interaction.reply({
            content: `### ✅ Ayarlar Güncellendi\n${changes.join('\n')}`,
            ephemeral: true
        });
    }
};
