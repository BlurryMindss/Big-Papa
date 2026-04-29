const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
const express = require('express');

// ======================
// DISCORD CLIENT
// ======================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ======================
// KEEP ALIVE SERVER (RAILWAY)
// ======================
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(3000, () => console.log('Web server ready'));

// ======================
// SAFETY HANDLERS (PREVENT CRASHES)
// ======================
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ======================
// ROBLOX: USER ID LOOKUP (FIXED)
// ======================
async function getUserId(username) {
  try {
    const res = await axios.post(
      'https://users.roblox.com/v1/usernames/users',
      {
        usernames: [username],
        excludeBannedUsers: true
      }
    );

    return res.data?.data?.[0]?.id || null;
  } catch (err) {
    console.error("Username lookup error:", err.message);
    return null;
  }
}

// ======================
// SLASH COMMANDS
// ======================
const commands = [
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Get Roblox profile')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('friends')
    .setDescription('Get Roblox friends')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('followers')
    .setDescription('Get Roblox followers')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('limiteds')
    .setDescription('Get Roblox limiteds')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('outfits')
    .setDescription('Get Roblox outfits')
    .addStringOption(o => o.setName('username').setRequired(true))
].map(c => c.toJSON());

// ======================
// REGISTER COMMANDS
// ======================
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered');
  } catch (err) {
    console.error(err);
  }
})();

// ======================
// BOT READY
// ======================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ======================
// COMMAND HANDLER (FIXED + SAFE)
// ======================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const username = interaction.options.getString('username');
  const userId = await getUserId(username);

  if (!userId) {
    return interaction.reply({
      content: '❌ User not found',
      ephemeral: true
    });
  }

  try {

    // 👤 PROFILE
    if (interaction.commandName === 'profile') {
      const res = await axios.get(`https://users.roblox.com/v1/users/${userId}`);

      return interaction.reply({
        embeds: [{
          title: res.data.displayName,
          description: res.data.description || "No bio",
          footer: { text: `User ID: ${userId}` }
        }]
      });
    }

    // 👥 FRIENDS
    if (interaction.commandName === 'friends') {
      const res = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends`)
        .catch(() => null);

      const friends = res?.data?.data || [];
      const list = friends.slice(0, 10).map(f => f.name).join(', ');

      return interaction.reply(`👥 Friends: ${list || 'None'}`);
    }

    // 👣 FOLLOWERS (FIXED SAFE)
    if (interaction.commandName === 'followers') {
      const res = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followers`)
        .catch(() => null);

      const count = res?.data?.data?.length || 0;

      return interaction.reply(`👣 Followers: ${count}`);
    }

    // 🧢 LIMITEDS (FIXED SAFE)
    if (interaction.commandName === 'limiteds') {
      const res = await axios.get(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles`)
        .catch(() => null);

      const items = res?.data?.data || [];
      const limiteds = items.slice(0, 10).map(i => i.name).join(', ');

      return interaction.reply(`🧢 Limiteds: ${limiteds || 'None'}`);
    }

    // 🎭 OUTFITS (FIXED SAFE)
    if (interaction.commandName === 'outfits') {
      const res = await axios.get(`https://avatar.roblox.com/v2/avatar/users/${userId}/outfits`)
        .catch(() => null);

      const outfits = res?.data?.data || [];
      const list = outfits.slice(0, 10).map(o => o.name).join(', ');

      return interaction.reply(`🎭 Outfits: ${list || 'None'}`);
    }

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      return interaction.reply({
        content: '❌ Error fetching Roblox data',
        ephemeral: true
      });
    }
  }
});

// ======================
// LOGIN
// ======================
client.login(process.env.DISCORD_TOKEN);