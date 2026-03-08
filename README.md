# Veyronix Ses Aktiflik Takip Botu

Bu bot, Discord sunucunuzdaki ses kanalı aktifliğini takip eder, veritabanına kaydeder ve belirli aralıklarla bir "Top 15" listesini günceller.

## Özellikler
- **Ses Takibi**: Kullanıcıların ses kanallarındaki sürelerini milisaniye bazında hesaplar.
- **Top 15 Listesi**: Belirlenen kanalda otomatik güncellenen şık bir embed.
- **Kişisel Profil**: `/profil` komutu ile haftalık 80 saatlik hedefe ilerlemenizi görün.
- **Gelişmiş Ayarlar**: İstatistik kanalı, yoksayılan kanallar ve susturulmuşları sayma kontrolü.
- **Veri Güvenliği**: **Quick.db (SQLite)** kullanarak verileri yerel bir dosyada (`json.sqlite`) saklar. Bot kapandığında aktif süreleri kaybetmez.

## Kurulum

1.  **Bağımlılıkları Yükleyin**:
    ```bash
    npm install
    ```
2.  **Yapılandırma**:
    `.env.example` dosyasını `.env` olarak değiştirin ve gerekli bilgileri doldurun:
    -   `DISCORD_TOKEN`: Botunuzun tokenı.
    -   `CLIENT_ID`: Botun ID'si.
    *(Not: MONGODB_URI artık gerekli değildir.)*

3.  **Çalıştırma**:
    ```bash
    node src/index.js
    ```

## Komutlar
-   `/ayarlar`: Sadece yöneticiler için. Kanal ve takip ayarları.
-   `/profil`: Kişisel ses istatistikleriniz (Sadece siz görebilirsiniz).

## Gereksinimler
-   Node.js v16.9.0 veya üzeri.
-   SQLite3 (Otomatik kurulur).
