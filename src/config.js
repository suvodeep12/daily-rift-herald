module.exports = {
  // Find the latest version from https://ddragon.leagueoflegends.com/api/versions.json
  LOL_VERSION: "15.12.1",

  // Define your cron schedule and timezone in one place
  CRON_SCHEDULE: "0 20 * * *", // 8:00 PM
  CRON_TIMEZONE: "Asia/Kolkata",

  // We can even store embed colors here for consistency
  EMBED_COLORS: {
    success: "#00FF00",
    error: "#FF0000",
    info: "#0099ff",
    neutral: "#808080",
  },
};
