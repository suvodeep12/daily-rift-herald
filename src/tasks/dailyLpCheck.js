// Replace the entire function in src/tasks/dailyLpCheck.js
const { EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const {
  getRankedData,
  getMatchIds,
  getMatchDetails,
} = require("../core/riot-api");
const config = require("../config");

module.exports = async (client) => {
  console.log("Running daily LP check task...");
  try {
    const channel = await client.channels.fetch(
      process.env.TARGET_DISCORD_CHANNEL_ID
    );
    if (!channel) return console.error("Target channel not found!");

    const players = await db.getAllTrackedPlayers();
    if (players.length === 0)
      return console.log("No players to check. Daily task finished.");

    for (const player of players) {
      const currentData = await getRankedData(player.gameName, player.tagLine);
      if (!currentData.success) continue;

      const lpChange = currentData.lp - player.lastLP;
      const rankChanged =
        currentData.tier !== player.lastTier ||
        currentData.rank !== player.lastRank;

      // --- NEW: Calculate Win/Loss Record ---
      let wins = 0;
      let losses = 0;
      const matchHistory = await getMatchIds(currentData.puuid);
      if (matchHistory.success && matchHistory.matches.length > 0) {
        for (const matchId of matchHistory.matches) {
          const matchResult = await getMatchDetails(matchId);
          if (matchResult.success) {
            const participant = matchResult.details.info.participants.find(
              (p) => p.puuid === currentData.puuid
            );
            if (participant) {
              if (participant.win) wins++;
              else losses++;
            }
          }
        }
      }
      // --- END NEW PART ---

      // Don't post if nothing has changed (no LP change, no rank change, no games played)
      if (lpChange === 0 && !rankChanged && wins === 0 && losses === 0)
        continue;

      const currentRank =
        currentData.tier === "UNRANKED"
          ? "UNRANKED"
          : `${currentData.tier} ${currentData.rank}`;
      const opggLink = `https://op.gg/summoners/sg/${encodeURIComponent(
        player.gameName
      )}-${player.tagLine}`;

      let description = `**${currentRank} - ${currentData.lp} LP**\n`;
      if (wins > 0 || losses > 0) {
        description += `**Today's Record: ${wins}W - ${losses}L**\n`;
      }

      if (rankChanged) {
        const oldRank =
          player.lastTier === "UNRANKED"
            ? "UNRANKED"
            : `${player.lastTier} ${player.lastRank}`;
        description += `*Rank changed from ${oldRank}*`;
      } else if (lpChange !== 0) {
        const gainOrLoss =
          lpChange > 0 ? `Gained ${lpChange}` : `Lost ${Math.abs(lpChange)}`;
        description += `**Today's Net LP:** ${
          lpChange > 0 ? "+" : ""
        }${lpChange} LP (${gainOrLoss})`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`LP Update for ${player.gameName}#${player.tagLine}`)
        .setURL(opggLink)
        .setColor(
          lpChange > 0
            ? config.EMBED_COLORS.success
            : lpChange < 0
            ? config.EMBED_COLORS.error
            : config.EMBED_COLORS.neutral
        )
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
    console.log("Daily LP check task finished.");
  } catch (error) {
    console.error("An error occurred during the daily LP check task:", error);
  }
};
