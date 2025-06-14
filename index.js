// index.js (Replacing the failing League call with a direct Fetch request)

// Step 1: Load environment variables.
require("dotenv").config();
const { DISCORD_TOKEN, RIOT_API_KEY, TARGET_DISCORD_CHANNEL_ID } = process.env;

// Step 2: Import all necessary libraries.
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const cron = require("node-cron");
const db = require("./db");
const { RiotApi, LolApi } = require("twisted");
const fetch = require("node-fetch"); // <-- We need fetch for the manual call
const express = require("express");

// Step 3: Initialize the two required API clients.
const riotApi = new RiotApi({ key: RIOT_API_KEY });
const lolApi = new LolApi({ key: RIOT_API_KEY });

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Add a simple web server for monitoring
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    status: "Bot is running",
    botTag: client.user?.tag || "Not logged in",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/riot.txt", (req, res) => {
  res.sendFile(__dirname + "/riot.txt");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server running on port ${PORT}`);
});

// --- API HELPER (Using a direct fetch for the final step) ---
async function getRankedData(gameName, tagLine) {
  try {
    // STEP 1: Get Account PUUID (This works).
    const accountData = await riotApi.Account.getByRiotId(
      gameName,
      tagLine,
      "asia"
    );
    const puuid = accountData.response.puuid;

    // STEP 2: Get Summoner ID from PUUID (This works).
    const summonerData = await lolApi.Summoner.getByPUUID(puuid, "sg2");
    const summonerId = summonerData.response.id;

    // console.log("Riot API Response:", summonerData.response);

    // STEP 3: Get Ranked Data using a manual, reliable fetch request. THIS IS THE FIX.
    const url = `https://sg2.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    const fetchResponse = await fetch(url, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    if (!fetchResponse.ok) {
      // Throw an error if the request failed, e.g., 404, 403, etc.
      throw new Error(`Request failed with status ${fetchResponse.status}`);
    }

    const leagueEntries = await fetchResponse.json();

    console.log("--- RAW RANK DATA FROM RIOT ---:", leagueEntries);

    const soloQueueData = leagueEntries.find(
      (entry) => entry.queueType === "RANKED_SOLO_5x5"
    );

    // console.log("Riot API Response:", soloQueueData);

    if (!soloQueueData) {
      return { puuid: puuid, lp: 0, tier: "UNRANKED", rank: "" };
    }

    return {
      puuid: puuid,
      lp: soloQueueData.leaguePoints,
      tier: soloQueueData.tier,
      rank: soloQueueData.rank,
    };
  } catch (error) {
    console.error(
      `Error fetching data for ${gameName}#${tagLine}:`,
      error.message
    );
    return null;
  }
}

// --- DAILY LP CHECKER (No changes needed here) ---
async function checkLpAndPost() {
  console.log("Running daily LP check...");
  const channel = await client.channels.fetch(TARGET_DISCORD_CHANNEL_ID);
  if (!channel) {
    console.error("Target channel not found!");
    return;
  }

  const players = await db.getAllTrackedPlayers();
  for (const player of players) {
    const currentData = await getRankedData(player.gameName, player.tagLine);
    if (!currentData) continue;

    const lpChange = currentData.lp - player.lastLP;
    const currentRank =
      currentData.tier === "UNRANKED"
        ? "UNRANKED"
        : `${currentData.tier} ${currentData.rank}`;
    const oldRank =
      player.lastTier === "UNRANKED"
        ? "UNRANKED"
        : `${player.lastTier} ${player.lastRank}`;

    let description = `**${currentRank} - ${currentData.lp} LP**\n`;
    if (currentRank !== oldRank && player.lastTier !== "UNRANKED") {
      description += `*Rank changed from ${oldRank}*`;
    } else if (lpChange !== 0) {
      const gainOrLoss =
        lpChange > 0 ? `Gained ${lpChange}` : `Lost ${Math.abs(lpChange)}`;
      description += `**Today's Net LP:** ${
        lpChange > 0 ? "+" : ""
      }${lpChange} LP (${gainOrLoss})`;
    } else {
      description += "No LP change since last check.";
    }

    const embed = new EmbedBuilder()
      .setTitle(`LP Update for ${player.gameName}#${player.tagLine}`)
      .setColor(lpChange > 0 ? "#00FF00" : lpChange < 0 ? "#FF0000" : "#808080")
      .setDescription(description)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await db.addOrUpdatePlayer(
      player.gameName,
      player.tagLine,
      player.region,
      currentData.puuid,
      currentData.lp,
      currentData.tier,
      currentData.rank
    );
  }
  console.log("Daily LP check finished.");
}

// --- BOT STARTUP (No changes needed here) ---
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await db.setupDatabase();

  cron.schedule("0 20 * * *", checkLpAndPost, {
    timezone: "Asia/Kolkata",
  });
  console.log("Cron job scheduled for 8:00 PM IST daily.");

  const GAME_NAME_TO_TRACK = "PM Narendra Modi";
  const TAG_LINE_TO_TRACK = "SG2";
  const REGION_TO_TRACK = "sg2";

  const isAlreadyTracked = await db.getPlayer(
    GAME_NAME_TO_TRACK,
    TAG_LINE_TO_TRACK,
    REGION_TO_TRACK
  );
  if (!isAlreadyTracked) {
    console.log(
      `First time setup: Fetching initial data for ${GAME_NAME_TO_TRACK}#${TAG_LINE_TO_TRACK}...`
    );
    const initialData = await getRankedData(
      GAME_NAME_TO_TRACK,
      TAG_LINE_TO_TRACK
    );
    if (initialData) {
      await db.addOrUpdatePlayer(
        GAME_NAME_TO_TRACK,
        TAG_LINE_TO_TRACK,
        REGION_TO_TRACK,
        initialData.puuid,
        initialData.lp,
        initialData.tier,
        initialData.rank
      );
      console.log(
        `Successfully added ${GAME_NAME_TO_TRACK}#${TAG_LINE_TO_TRACK} to the tracking database.`
      );
    }
  }
});

client.login(DISCORD_TOKEN);
