const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
const express = require('express');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 🌐 Keep-alive server (for Railway)
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Web server ready on port ${PORT}`));

// 🔁 Convert username → userId
async function getUserId(username) {
  const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
    usernames: [username]
  });
  return res.data.data[0]?.id;
}

// 📜 Commands
const commands = [
  new SlashCommandBuilder().setName('profile')
    .setDescription('Get Roblox profile')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder().setName('friends')
    .setDescription('Get friends list')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder().setName('followers')
    .setDescription('Get followers')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder().setName('limiteds')
    .setDescription('Get limited items')
    .addStringOption(o => o.setName('username').setRequired(true)),

  new SlashCommandBuilder().setName('outfits')
    .setDescription('Get outfits')
    .addStringOption(o => o.setName('username').setRequired(true))
].map(c => c.toJSON());

// 🚀 Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Commands registered');
  } catch (err) {
    console.error(err);
  }
})();

// 🤖 Bot ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ⚡ Command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const username = interaction.options.getString('username');
  const userId = await getUserId(username);

  if (!userId) {
    return interaction.reply('User not found');
  }

  try {
    // 👤 PROFILE
    if (interaction.commandName === 'profile') {
      const res = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
      return interaction.reply({
        embeds: [{
          title: res.data.displayName,
          description: res.data.description || "No bio",
          footer: { text: `ID: ${userId}` }
        }]
      });
    }

    // 👥 FRIENDS
    if (interaction.commandName === 'friends') {
      const res = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends`);
      const names = res.data.data.slice(0, 10).map(f => f.name).join(', ');
      return interaction.reply(`Friends: ${names || 'None'}`);
    }

    // 👣 FOLLOWERS
    if (interaction.commandName === 'followers') {
      const res = await axios.get(`https://friends.roblox.com/v1/users/${userId}/followers`);
      return interaction.reply(`Followers: ${res.data.data.length}`);
    }

    // 🧢 LIMITEDS
    if (interaction.commandName === 'limiteds') {
      const res = await axios.get(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles`);
      const items = res.data.data.slice(0, 10).map(i => i.name).join(', ');
      return interaction.reply(`Limiteds: ${items || 'None'}`);
    }

    // 🎭 OUTFITS
    if (interaction.commandName === 'outfits') {
      const res = await axios.get(`https://avatar.roblox.com/v2/avatar/users/${userId}/outfits`);
      const outfits = res.data.data.slice(0, 10).map(o => o.name).join(', ');
      return interaction.reply(`Outfits: ${outfits || 'None'}`);
    }

  } catch (err) {
    console.error(err);
    interaction.reply('Error fetching data (maybe private profile)');
  }
});

client.login(process.env.DISCORD_TOKEN);
