require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel],
});

const WALLPAPER_CHANNEL_ID = '1308574522139611237';
const INFO_CHANNEL_ID = '1372927519300522047';
const BOT_LOG_CHANNEL_ID = '1372938462596169758';

const userCooldowns = new Map(); // cooldown tracking

client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Send agreement button on startup
client.on(Events.ClientReady, async () => {
    const channel = await client.channels.fetch(INFO_CHANNEL_ID);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('agree_rules')
            .setLabel('✅ Agree to Fair Use')
            .setStyle(ButtonStyle.Success)
    );

    await channel.send({
    content: `📜 **Fair Use Policy & Usage Disclaimer**

By accessing this channel, you acknowledge and agree to the following:

⚠️ **Ownership Notice**  
These assets are either my own property or belong to **Nekki**. Do **not** use them on the internet — including YouTube, social media, or any commercial platform — **without explicit permission**.

✅ **Permitted Use**  
You agree to use these wallpapers strictly for **personal, non-commercial purposes** only.

🤝 **Support & Credit**  
If you feature any of these visuals in a video (after taking permission), please add the following in your content to support us:

> 🗣️ *"We’d like to shout out* __@Shadows Fate__ *for the amazing visuals!"*

Click the button below to confirm your agreement and get temporary access to the channel.`,
    components: [row],
});

});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'agree_rules') return;

    const now = Date.now();
    const cooldownEnd = userCooldowns.get(interaction.user.id);

    if (cooldownEnd && cooldownEnd > now) {
        const remaining = Math.ceil((cooldownEnd - now) / 1000);
        await interaction.reply({
            content: `⏳ You're on cooldown. Please wait ${remaining} seconds before trying again.`,
            ephemeral: true,
        });
        return;
    }

    try {
        const wallpaperChannel = await client.channels.fetch(WALLPAPER_CHANNEL_ID);
        const logChannel = await client.channels.fetch(BOT_LOG_CHANNEL_ID);

        // Grant access
        await wallpaperChannel.permissionOverwrites.create(interaction.user.id, {
            ViewChannel: true,
        });

        await interaction.reply({
            content: `✅ You've been granted access to **#${wallpaperChannel.name}** for 15 minutes.`,
            ephemeral: true,
        });

        await logChannel.send(`📥 **${interaction.user.tag}** agreed to rules and got access for 15 minutes.`);

        console.log(`[ACCESS GRANTED] ${interaction.user.tag} now has access to #${wallpaperChannel.name}`);

        // Schedule 1-minute warning before removal
        setTimeout(async () => {
            try {
                await interaction.user.send(`⏳ Your access to **#${wallpaperChannel.name}** will be removed in 1 minute.`);
            } catch {
                console.log(`[DM FAILED] Could not DM ${interaction.user.tag}`);
            }
        }, 14 * 60 * 1000);

        // Remove access after 15 minutes
        setTimeout(async () => {
            try {
                await wallpaperChannel.permissionOverwrites.delete(interaction.user.id);
                await logChannel.send(`📤 **${interaction.user.tag}**'s access to #${wallpaperChannel.name} has been revoked.`);
                console.log(`[ACCESS REVOKED] ${interaction.user.tag} removed from #${wallpaperChannel.name}`);
            } catch (err) {
                console.error(`Failed to remove permissions for ${interaction.user.tag}:`, err);
            }
        }, 15 * 60 * 1000);

        // Set cooldown for 5 minutes
        userCooldowns.set(interaction.user.id, now + 5 * 60 * 1000);

    } catch (err) {
        console.error('Error during agreement flow:', err);
        await interaction.reply({
            content: '⚠️ Something went wrong. Try again later.',
            ephemeral: true,
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
