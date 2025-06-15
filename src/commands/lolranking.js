const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const { getRankedData } = require("../core/riot-api");
const config = require("../config");

// Helper object to convert ranks to numerical values for sorting (no change here)
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

// --- NEW: A helper function to add a delay ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  // I will use 'lolranking' as the name based on your error log
  data: new SlashCommandBuilder()
    .setName("lolranking")
    .setDescription(
      "Displays a live ranked leaderboard of all tracked players."
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const trackedPlayers = await db.getAllTrackedPlayers();

    if (trackedPlayers.length === 0) {
      return interaction.editReply(
        "There are no players being tracked to create a leaderboard."
      );
    }

    // Let the user know what's happening, as this will take longer now
    await interaction.editReply(
      `Fetching live data for ${trackedPlayers.length} players... This may take a moment.`
    );

    // --- THIS IS THE NEW, RATE-LIMITED LOGIC ---
    const fetchedPlayers = [];
    let successfulFetches = 0;

    // 1. Process players one by one instead of all at once.
    for (const player of trackedPlayers) {
      const data = await getRankedData(player.gameName, player.tagLine);

      if (data.success) {
        // Update the player's entry in our database with the fresh data.
        // THIS IS THE DATABASE FIX: We pass all required parameters correctly.
        await db.addOrUpdatePlayer(
          player.gameName,
          player.tagLine,
          "sg2",
          data.puuid,
          data.lp,
          data.tier,
          data.rank
        );
        fetchedPlayers.push({ ...player, ...data }); // Combine DB info and live data
        successfulFetches++;
      }

      // 2. Add a small delay between each API call to avoid rate limits.
      // 100 milliseconds is usually safe.
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

      description += `**${index + 1}.** ${p.gameName}#${
        p.tagLine
      } - *${rankString} (${p.lp} LP)*\n`;
    });
    embed.setDescription(description);

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};
