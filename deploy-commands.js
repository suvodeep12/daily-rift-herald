require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./src/commands/${file}`);
  console.log(`- Found command: /${command.data.name}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // You might want to deploy to a single server for testing first
    // To do that, replace Routes.applicationCommands with Routes.applicationGuildCommands
    // And provide your server/guild ID, e.g., Routes.applicationGuildCommands(process.env.CLIENT_ID, 'YOUR_GUILD_ID')

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // CLIENT_ID is your bot's Application ID
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
