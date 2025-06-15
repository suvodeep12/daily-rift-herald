const { EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const { getRankedData } = require("../core/riot-api");
const config = require("../config");

// The function is now self-contained in its own module.
// We pass 'client' as an argument so it can fetch the channel.
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
      // ... (The entire for-loop logic from your index.js goes here) ...
      // The following is the same logic you already have.
      const currentData = await getRankedData(player.gameName, player.tagLine);
      if (!currentData.success) continue;

      const lpChange = currentData.lp - player.lastLP;
      if (lpChange === 0 && currentData.tier === player.lastTier) continue;

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

      const opggLink = `https://op.gg/summoners/sg/${encodeURIComponent(
        player.gameName
      )}-${player.tagLine}`;
      // const iconURL = `http://ddragon.leagueoflegends.com/cdn/${config.LOL_VERSION}/img/profileicon/${currentData.profileIconId}.png`;

      const embed = new EmbedBuilder()
        .setTitle(`LP Update for ${player.gameName}#${player.tagLine}`)
        .setURL(opggLink)
        // .setThumbnail(iconURL) // Uncomment this once you implement profile icons
        .setColor(
          lpChange > 0 ? config.EMBED_COLORS.success : config.EMBED_COLORS.error
        )
        .setDescription(description)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      // Assuming you haven't implemented profile icons in the DB yet
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
