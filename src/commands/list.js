const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../core/database.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("Lists all players currently being tracked."),
  async execute(interaction) {
    await interaction.deferReply(); // Acknowledge the command immediately

    const players = await db.getAllTrackedPlayers();

    if (players.length === 0) {
      return interaction.editReply("No players are currently being tracked.");
    }

    const embed = new EmbedBuilder()
      .setTitle("Tracked Players")
      .setColor("#0099ff")
      .setTimestamp();

    let description = "";
    for (const player of players) {
      const rank =
        player.lastTier === "UNRANKED"
          ? "Unranked"
          : `${player.lastTier} ${player.lastRank}`;
      description += `**${player.gameName}#${player.tagLine}** - ${rank} (${player.lastLP} LP)\n`;
    }
    embed.setDescription(description);

    await interaction.editReply({ embeds: [embed] });
  },
};
