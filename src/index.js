require("dotenv").config({ path: "../.env" }); // Go up one level to find .env
const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
const cron = require("node-cron");
const db = require("./core/database.js");
const { getRankedData } = require("./core/riot-api.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- Command Handling ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// --- Event: When a user uses a command ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

// --- DAILY LP CHECKER ---
async function checkLpAndPost() {
  // This function remains largely the same as your working version
  // We can enhance it later to support multiple servers
  console.log("Running daily LP check...");
  const channel = await client.channels.fetch(
    process.env.TARGET_DISCORD_CHANNEL_ID
  );
  if (!channel) return console.error("Target channel not found!");

  const players = await db.getAllTrackedPlayers();
  for (const player of players) {
    const currentData = await getRankedData(player.gameName, player.tagLine);
    if (!currentData.success) continue;

    const lpChange = currentData.lp - player.lastLP;
    if (lpChange === 0) continue; // Skip posting if there's no change

    const currentRank =
      currentData.tier === "UNRANKED"
        ? "UNRANKED"
        : `${currentData.tier} ${currentData.rank}`;
    const oldRank =
      player.lastTier === "UNRANKED"
        ? "UNRANKED"
        : `${player.lastTier} ${player.lastRank}`;

    let description = `**${currentRank} - ${currentData.lp} LP**\n`;
    if (currentRank !== oldRank) {
      description += `*Rank changed from ${oldRank}*`;
    } else {
      const gainOrLoss =
        lpChange > 0 ? `Gained ${lpChange}` : `Lost ${Math.abs(lpChange)}`;
      description += `**Today's Net LP:** ${
        lpChange > 0 ? "+" : ""
      }${lpChange} LP (${gainOrLoss})`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`LP Update for ${player.gameName}#${player.tagLine}`)
      .setColor(lpChange > 0 ? "#00FF00" : "#FF0000")
      .setDescription(description)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await db.addOrUpdatePlayer(
      player.gameName,
      player.tagLine,
      "sg2",
      currentData.puuid,
      currentData.lp,
      currentData.tier,
      currentData.rank
    );
  }
  console.log("Daily LP check finished.");
}

// --- Event: When the bot is ready ---
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await db.setupDatabase();

  cron.schedule("0 10 * * *", checkLpAndPost, {
    timezone: "Asia/Singapore",
  });
  console.log("Cron job scheduled for SG timezone.");
});

client.login(process.env.DISCORD_TOKEN);
