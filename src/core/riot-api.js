// The complete and correct content for src/core/riot-api.js
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
    const profileIconId = summonerData.response.profileIconId;

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
        puuid,
        profileIconId,
        lp: 0,
        tier: "UNRANKED",
        rank: "",
      };
    }

    return {
      success: true,
      puuid,
      profileIconId,
      lp: soloQueueData.leaguePoints,
      tier: soloQueueData.tier,
      rank: soloQueueData.rank,
    };
  } catch (error) {
    console.error(`Riot API Error for ${gameName}#${tagLine}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function getMatchIds(puuid) {
  try {
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;
    const options = {
      startTime: twentyFourHoursAgo,
      queue: 420, // 420 is the ID for Ranked Solo/Duo
      count: 100, // Get up to 100 matches
    };
    const matchList = await lolApi.Match.list(puuid, "asia", options);
    return { success: true, matches: matchList.response };
  } catch (error) {
    console.error(`API Error getting match list for ${puuid}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function getMatchDetails(matchId) {
  try {
    const matchDetails = await lolApi.Match.get(matchId, "asia");
    return { success: true, details: matchDetails.response };
  } catch (error) {
    console.error(
      `API Error getting details for match ${matchId}:`,
      error.message
    );
    return { success: false, error: error.message };
  }
}

module.exports = { getRankedData, getMatchIds, getMatchDetails };
