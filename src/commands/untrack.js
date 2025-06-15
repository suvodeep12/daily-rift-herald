const { SlashCommandBuilder } = require("discord.js");
const db = require("../core/database.js"); // Assuming your database functions are here

// --- New Database Function ---
// We need a way to delete a player from the database.
// Let's add this function to our database service.
// This is a placeholder for now, we will add the real function to database.js next.
async function deletePlayer(gameName, tagLine, region) {
  // This function will be implemented in database.js
  // For now, we'll just return a placeholder value.
  return Promise.resolve();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("untrack")
    .setDescription("Stops tracking a League of Legends player.")
    .addStringOption((option) =>
      option
        .setName("riot_id")
        .setDescription(
          "The Riot ID of the player to remove (e.g., PlayerName#TAG)"
        )
        .setRequired(true)
    ),
  async execute(interaction) {
    // Acknowledge the command immediately, visible only to the user
    await interaction.deferReply({ ephemeral: true });

    const riotId = interaction.options.getString("riot_id");
    if (!riotId.includes("#")) {
      return interaction.editReply(
        "Error: Invalid Riot ID format. Please use `PlayerName#TagLine`."
      );
    }

    const [gameName, tagLine] = riotId.split("#");
    const region = "sg2"; // The region is consistent for your bot

    // Check if the player is even being tracked first
    const existingPlayer = await db.getPlayer(gameName, tagLine, region);
    if (!existingPlayer) {
      return interaction.editReply(
        `**${gameName}#${tagLine}** is not currently on the tracking list.`
      );
    }

    // Call the database function to delete the player
    const result = await db.deletePlayer(gameName, tagLine, region);

    if (result.changes > 0) {
      await interaction.editReply(
        `Successfully removed **${gameName}#${tagLine}** from the tracking list.`
      );
    } else {
      await interaction.editReply(
        `Could not find **${gameName}#${tagLine}** in the database. No changes were made.`
      );
    }
  },
};
