const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const config = require("../config");

// This helper object converts ranks into a numerical score so we can sort players accurately.
const rankValues = {
  // We give a base score for each tier.
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 2800,
  CHALLENGER: 2800,
};
// We add a smaller score for each division within a tier.
const divisionValues = { IV: 0, III: 100, II: 200, I: 300 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lolranking")
    .setDescription("Displays a ranked leaderboard of all tracked players."),
  async execute(interaction) {
    // Acknowledge the command immediately. This gives us more time to process.
    await interaction.deferReply();

    const players = await db.getAllTrackedPlayers();

    if (players.length === 0) {
      return interaction.editReply(
        "There are no players being tracked. Use `/track` to add someone!"
      );
    }

    // Calculate a numerical score for each player to allow for accurate sorting.
    const playersWithScores = players.map((player) => {
      let score = 0;
      // Only calculate a score if the player is ranked.
      if (player.lastTier && player.lastTier !== "UNRANKED") {
        score =
          (rankValues[player.lastTier] || 0) +
          (divisionValues[player.lastRank] || 0) +
          player.lastLP;
      }
      // Return a new object that includes the original player data plus the new score.
      return { ...player, score };
    });

    // Sort the players by their score in descending order (highest rank first).
    const sortedPlayers = playersWithScores.sort((a, b) => b.score - a.score);

    const embed = new EmbedBuilder()
      .setColor(config.EMBED_COLORS.info)
      .setTitle("Server Ranked Leaderboard")
      .setTimestamp()
      .setFooter({ text: "Daily Rift Herald" });

    // Build the description string by looping through the sorted players.
    let description = "";
    sortedPlayers.forEach((player, index) => {
      const rankString =
        player.lastTier && player.lastTier !== "UNRANKED"
          ? `${player.lastTier} ${player.lastRank}`
          : "Unranked";

      // Add each player as a new line in the description.
      description += `**${index + 1}.** ${player.gameName}#${
        player.tagLine
      } - *${rankString} (${player.lastLP} LP)*\n`;
    });
    embed.setDescription(description);

    // Reply to the interaction with the final, complete embed.
    await interaction.editReply({ embeds: [embed] });
  },
};
