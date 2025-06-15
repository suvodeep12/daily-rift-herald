// The complete, simplified content for src/core/riot-api.js
const { RiotApi, LolApi } = require("twisted");
const fetch = require("node-fetch");

const riotApi = new RiotApi({ key: process.env.RIOT_API_KEY });
const lolApi = new LolApi({ key: process.env.RIOT_API_KEY });

async function getRankedData(gameName, tagLine) {
  try {
    const accountData = await riotApi.Account.getByRiotId(
      gameName,
      tagLine,
      "asia"
    );
    const puuid = accountData.response.puuid;

    const summonerData = await lolApi.Summoner.getByPUUID(puuid, "sg2");
    const summonerId = summonerData.response.id;

    const url = `https://sg2.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    const fetchResponse = await fetch(url, {
      headers: { "X-Riot-Token": process.env.RIOT_API_KEY },
    });

    if (!fetchResponse.ok)
      throw new Error(`Request failed with status ${fetchResponse.status}`);

    const leagueEntries = await fetchResponse.json();
    const soloQueueData = leagueEntries.find(
      (entry) => entry.queueType === "RANKED_SOLO_5x5"
    );

    if (!soloQueueData) {
      return {
        success: true,
        puuid: puuid,
        lp: 0,
        tier: "UNRANKED",
        rank: "",
        wins: 0,
        losses: 0,
      };
    }

    // --- THIS IS THE KEY ---
    // The API response already includes total wins and losses for the season.
    return {
      success: true,
      puuid: puuid,
      lp: soloQueueData.leaguePoints,
      tier: soloQueueData.tier,
      rank: soloQueueData.rank,
      wins: soloQueueData.wins, // Add this
      losses: soloQueueData.losses, // Add this
    };
  } catch (error) {
    console.error(`Riot API Error for ${gameName}#${tagLine}:`, error.message);
    return { success: false, error: error.message };
  }
}

// We only need to export one function now.
module.exports = { getRankedData };
