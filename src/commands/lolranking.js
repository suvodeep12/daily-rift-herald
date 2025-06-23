const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const { getRankedData } = require("../core/riot-api");
const config = require("../config");

// Helper objects for sorting
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

const rankEmojiMap = {
  IRON: "iron",
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
  EMERALD: "emerald",
  DIAMOND: "diamond",
  MASTER: "master",
  GRANDMASTER: "grandmaster",
  CHALLENGER: "challenger",
};

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

    const fetchedPlayers = [];
    let successfulFetches = 0;
    for (const player of trackedPlayers) {
      const data = await getRankedData(player.gameName, player.tagLine);
      if (data.success) {
        fetchedPlayers.push({ ...player, ...data });
        successfulFetches++;
      }
      await sleep(100);
    }

    if (fetchedPlayers.length === 0) {
      return interaction.editReply(
        "Could not fetch live data for any players."
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
      const tierEmojiName = rankEmojiMap[p.tier];
      const rankEmoji = tierEmojiName
        ? interaction.guild.emojis.cache.find(
            (emoji) => emoji.name === tierEmojiName
          )
        : "";
      const rankString =
        p.tier && p.tier !== "UNRANKED"
          ? `${rankEmoji} ${p.tier} ${p.rank}`
          : "Unranked";

      const totalGames = p.wins + p.losses;
      const winrate = totalGames > 0 ? (p.wins / totalGames) * 100 : 0;

      let trendEmoji;
      if (winrate > 50) {
        trendEmoji =
          interaction.guild.emojis.cache.find(
            (emoji) => emoji.name === "arrow_up"
          ) || "🔼";
      } else if (winrate < 50) {
        trendEmoji =
          interaction.guild.emojis.cache.find(
            (emoji) => emoji.name === "small_red_triangle_down"
          ) || "🔻";
      } else {
        // Exactly 50%
        trendEmoji =
          interaction.guild.emojis.cache.find(
            (emoji) => emoji.name === "heavy_minus_sign"
          ) || "➖";
      }

      const winLossString =
        totalGames > 0
          ? `  |  **${p.wins}W ${p.losses}L** ${trendEmoji} (${winrate.toFixed(
              1
            )}%)`
          : ""; // Show nothing if no games played

      description += `**${index + 1}.** ${p.gameName}#${
        p.tagLine
      } - *${rankString} (${p.lp} LP)*${winLossString}\n`;
    });
    embed.setDescription(description);

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};
