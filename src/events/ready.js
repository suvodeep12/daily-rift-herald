const { Events } = require("discord.js");
const cron = require("node-cron");
const db = require("../core/database");
const dailyLpCheckTask = require("../tasks/dailyLpCheck");
const config = require("../config");

module.exports = {
  name: Events.ClientReady, // This identifies the event
  once: true, // This event should only run once
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}!`);

    await db.setupDatabase();

    cron.schedule(config.CRON_SCHEDULE, () => dailyLpCheckTask(client), {
      timezone: config.CRON_TIMEZONE,
    });
    console.log(
      `Cron job scheduled to run daily at 8:00 PM IST (${config.CRON_TIMEZONE}).`
    );
  },
};
