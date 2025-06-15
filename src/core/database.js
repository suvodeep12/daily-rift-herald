// db.js (Updated)
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

let db;

async function setupDatabase() {
  db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  // Updated table schema
  await db.exec(`
        CREATE TABLE IF NOT EXISTS tracked_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gameName TEXT NOT NULL,
            tagLine TEXT NOT NULL,
            region TEXT NOT NULL,
            puuid TEXT NOT NULL,
            lastLP INTEGER,
            lastTier TEXT,
            lastRank TEXT,
            lastCheckedAt DATETIME,
            UNIQUE(gameName, tagLine, region)
        )
    `);
  console.log("Database is ready.");
}

// Updated function to add or update a player
async function addOrUpdatePlayer(
  gameName,
  tagLine,
  region,
  puuid,
  lp,
  tier,
  rank
) {
  const now = new Date();
  const existing = await getPlayer(gameName, tagLine, region);
  if (existing) {
    return db.run(
      "UPDATE tracked_players SET puuid = ?, lastLP = ?, lastTier = ?, lastRank = ?, lastCheckedAt = ? WHERE gameName = ? AND tagLine = ? AND region = ?",
      puuid,
      lp,
      tier,
      rank,
      now,
      gameName,
      tagLine,
      region
    );
  } else {
    return db.run(
      "INSERT INTO tracked_players (gameName, tagLine, region, puuid, lastLP, lastTier, lastRank, lastCheckedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      gameName,
      tagLine,
      region,
      puuid,
      lp,
      tier,
      rank,
      now
    );
  }
}

// Updated function to get a player's data
async function getPlayer(gameName, tagLine, region) {
  return db.get(
    "SELECT * FROM tracked_players WHERE gameName = ? AND tagLine = ? AND region = ?",
    gameName,
    tagLine,
    region
  );
}

// Updated function to get all tracked players
async function getAllTrackedPlayers() {
  return db.all("SELECT * FROM tracked_players");
}

module.exports = {
  setupDatabase,
  addOrUpdatePlayer,
  getPlayer,
  getAllTrackedPlayers,
};
