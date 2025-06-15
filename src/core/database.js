// The complete and correct content for src/core/database.js
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
let db;

async function setupDatabase() {
  db = await open({ filename: "./database.sqlite", driver: sqlite3.Database });
  await db.exec(`
        CREATE TABLE IF NOT EXISTS tracked_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gameName TEXT NOT NULL COLLATE NOCASE,
            tagLine TEXT NOT NULL COLLATE NOCASE,
            region TEXT NOT NULL,
            puuid TEXT NOT NULL,
            profileIconId INTEGER,
            lastLP INTEGER,
            lastTier TEXT,
            lastRank TEXT,
            lastCheckedAt DATETIME,
            UNIQUE(gameName, tagLine, region)
        )
    `);
  console.log("Database (with profileIconId support) is ready.");
}

async function addOrUpdatePlayer(
  gameName,
  tagLine,
  region,
  puuid,
  profileIconId,
  lp,
  tier,
  rank
) {
  const now = new Date();
  const existing = await getPlayer(gameName, tagLine, region);
  if (existing) {
    return db.run(
      "UPDATE tracked_players SET puuid = ?, profileIconId = ?, lastLP = ?, lastTier = ?, lastRank = ?, lastCheckedAt = ? WHERE gameName = ? AND tagLine = ? AND region = ?",
      puuid,
      profileIconId,
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
      "INSERT INTO tracked_players (gameName, tagLine, region, puuid, profileIconId, lastLP, lastTier, lastRank, lastCheckedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      gameName,
      tagLine,
      region,
      puuid,
      profileIconId,
      lp,
      tier,
      rank,
      now
    );
  }
}

async function getPlayer(gameName, tagLine, region) {
  return db.get(
    "SELECT * FROM tracked_players WHERE gameName = ? AND tagLine = ? AND region = ?",
    gameName,
    tagLine,
    region
  );
}
async function getAllTrackedPlayers() {
  return db.all("SELECT * FROM tracked_players");
}
async function deletePlayer(gameName, tagLine, region) {
  return db.run(
    "DELETE FROM tracked_players WHERE gameName = ? AND tagLine = ? AND region = ?",
    gameName,
    tagLine,
    region
  );
}
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
