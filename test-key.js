// test-key.js
require("dotenv").config();
const fetch = require("node-fetch");

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const GAME_NAME = "PM Narendra Modi";
const TAG_LINE = "SG2";

// Manually encode the game name to handle spaces correctly in the URL
const encodedGameName = encodeURIComponent(GAME_NAME);

const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${TAG_LINE}?api_key=${RIOT_API_KEY}`;

console.log("Testing Riot API key...");
console.log("URL:", url);
console.log(
  "Key:",
  RIOT_API_KEY
    ? `RGAPI-....${RIOT_API_KEY.slice(-5)}`
    : "Key not found in .env!"
);

async function testKey() {
  if (!RIOT_API_KEY) {
    console.error("ERROR: RIOT_API_KEY is not defined in your .env file.");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    console.log(`\n--- RESULT ---`);
    console.log(`Status Code: ${response.status} (${response.statusText})`);

    const data = await response.json();
    console.log("Response Body:", data);
  } catch (error) {
    console.error("\n--- FAILED TO SEND REQUEST ---");
    console.error(error);
  }
}

testKey();
