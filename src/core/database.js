// db.js (Updated)
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

let db;

async function setupDatabase() {
  db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  // The COLLATE NOCASE instruction is the fix
  await db.exec(`
        CREATE TABLE IF NOT EXISTS tracked_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gameName TEXT NOT NULL COLLATE NOCASE,
            tagLine TEXT NOT NULL COLLATE NOCASE,
            region TEXT NOT NULL,
            puuid TEXT NOT NULL,
            lastLP INTEGER,
            lastTier TEXT,
            lastRank TEXT,
            lastCheckedAt DATETIME,
            UNIQUE(gameName, tagLine, region)
        )
    `);
  console.log("Database (case-insensitive) is ready.");
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

// Function to delete a player by their Riot ID and region
async function deletePlayer(gameName, tagLine, region) {
  return db.run(
    "DELETE FROM tracked_players WHERE gameName = ? AND tagLine = ? AND region = ?",
    gameName,
    tagLine,
    region
  );
}

// --- ADD THIS NEW FUNCTION ---
// Function to delete a player by their unique database ID
async function deletePlayerById(id) {
  return db.run("DELETE FROM tracked_players WHERE id = ?", id);
}

module.exports = {
  setupDatabase,
  addOrUpdatePlayer,
  getPlayer,
  getAllTrackedPlayers,
  deletePlayer,
  deletePlayerById,
};
