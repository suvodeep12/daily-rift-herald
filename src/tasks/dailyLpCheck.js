const { EmbedBuilder } = require("discord.js");
const db = require("../core/database");
const { getRankedData } = require("../core/riot-api");
const config = require("../config");

// --- NEW: A helper function to add a delay ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    console.log(`Checking ${players.length} players...`);

    // --- THIS IS THE NEW, RATE-LIMITED LOGIC ---
    // 1. Process players one by one instead of all at once.
    for (const player of players) {
      const currentData = await getRankedData(player.gameName, player.tagLine);
      if (!currentData.success) {
        console.log(
          `Skipping ${player.gameName}#${player.tagLine} due to API error.`
        );
        await sleep(100); // Still wait even on error to be safe
        continue; // Move to the next player
      }

      const lpChange = currentData.lp - player.lastLP;
      const rankChanged =
        currentData.tier !== player.lastTier ||
        currentData.rank !== player.lastRank;

      // Don't post an update if nothing significant has changed.
      if (lpChange === 0 && !rankChanged) {
        // But we should still update the database with the latest check-in time.
        await db.addOrUpdatePlayer(
          player.gameName,
          player.tagLine,
          "sg2",
          currentData.puuid,
          currentData.lp,
          currentData.tier,
          currentData.rank
        );
        await sleep(100); // Wait before the next player
        continue;
      }

      // If we've reached here, it means something changed and we should post.
      const currentRank =
        currentData.tier === "UNRANKED"
          ? "UNRANKED"
          : `${currentData.tier} ${currentData.rank}`;

      let description = `**${currentRank} - ${currentData.lp} LP**\n`;
      if (rankChanged) {
        const oldRank =
          player.lastTier === "UNRANKED"
            ? "UNRANKED"
            : `${player.lastTier} ${player.lastRank}`;
        description += `*Rank changed from ${oldRank}*`;
      } else {
        // lpChange must be non-zero if we reached this point
        const gainOrLoss =
          lpChange > 0 ? `Gained ${lpChange}` : `Lost ${Math.abs(lpChange)}`;
        description += `**Today's Net LP:** ${
          lpChange > 0 ? "+" : ""
        }${lpChange} LP (${gainOrLoss})`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`LP Update for ${player.gameName}#${player.tagLine}`)
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

      // Update the player's entry in our database with the fresh data.
      await db.addOrUpdatePlayer(
        player.gameName,
        player.tagLine,
        "sg2",
        currentData.puuid,
        currentData.lp,
        currentData.tier,
        currentData.rank
      );

      // 2. Add a small delay between each player to avoid rate limits.
      await sleep(100);
    }
    // --- END OF NEW LOGIC ---

    console.log("Daily LP check task finished.");
  } catch (error) {
    console.error(
      "A critical error occurred during the daily LP check task:",
      error
    );
  }
};
