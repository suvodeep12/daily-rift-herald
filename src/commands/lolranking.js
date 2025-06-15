const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const { getRankedData } = require("../core/riot-api"); // We only need one API function now
const config = require("../config");

// Helper objects for sorting (no change here)
const rankValues = {
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
const divisionValues = { IV: 0, III: 100, II: 200, I: 300 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lolranking")
    .setDescription(
      "Displays a live ranked leaderboard with season win/loss records."
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const trackedPlayers = await db.getAllTrackedPlayers();
    if (trackedPlayers.length === 0) {
      return interaction.editReply("There are no players to track.");
    }

    await interaction.editReply(
      `Fetching live data for ${trackedPlayers.length} players...`
    );

    // --- THIS IS THE NEW, SIMPLIFIED LOGIC ---
    const fetchedPlayers = [];
    let successfulFetches = 0;

    for (const player of trackedPlayers) {
      // The getRankedData function now returns everything we need in one call!
      const data = await getRankedData(player.gameName, player.tagLine);

      if (data.success) {
        await db.addOrUpdatePlayer(
          player.gameName,
          player.tagLine,
          "sg2",
          data.puuid,
          data.lp,
          data.tier,
          data.rank
        );
        fetchedPlayers.push({ ...player, ...data });
        successfulFetches++;
      }

      // We still keep the delay to be kind to the API.
      await sleep(100);
    }
    // --- END OF NEW LOGIC ---

    if (fetchedPlayers.length === 0) {
      return interaction.editReply(
        "Could not fetch live data for any players. The Riot API might be having issues."
      );
    }

    const playersWithScores = fetchedPlayers.map((p) => {
      let score = 0;
      if (p.tier && p.tier !== "UNRANKED") {
        score =
          (rankValues[p.tier] || 0) + (divisionValues[p.rank] || 0) + p.lp;
      }
      return { ...p, score };
    });

    const sortedPlayers = playersWithScores.sort((a, b) => b.score - a.score);

    const embed = new EmbedBuilder()
      .setColor(config.EMBED_COLORS.info)
      .setTitle("Live Server Leaderboard")
      .setTimestamp()
      .setFooter({
        text: `Fetched ${successfulFetches}/${trackedPlayers.length} players successfully.`,
      });

    let description = "";
    sortedPlayers.forEach((p, index) => {
      const rankString =
        p.tier && p.tier !== "UNRANKED" ? `${p.tier} ${p.rank}` : "Unranked";

      // Calculate winrate. Use .toFixed(1) for one decimal place.
      const totalGames = p.wins + p.losses;
      const winrate =
        totalGames > 0 ? ((p.wins / totalGames) * 100).toFixed(1) : "N/A";

      // --- NEW: Display Season W/L and Winrate ---
      const winLossString = `  |  **${p.wins}W ${p.losses}L** (${winrate}%)`;

      description += `**${index + 1}.** ${p.gameName}#${
        p.tagLine
      } - *${rankString} (${p.lp} LP)*${winLossString}\n`;
    });
    embed.setDescription(description);

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};
