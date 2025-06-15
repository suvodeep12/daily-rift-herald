// The complete and correct content for src/commands/untrack.js

const { SlashCommandBuilder } = require("discord.js");
const db = require("../core/database.js");

module.exports = {
  // --- 1. THE COMMAND DEFINITION ---
  // We add .setAutocomplete(true) to tell Discord this option uses autocomplete.
  data: new SlashCommandBuilder()
    .setName("untrack")
    .setDescription("Stops tracking a player by selecting them from a list.")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("The player you want to stop tracking.")
        .setRequired(true)
        .setAutocomplete(true)
    ), // <-- THIS IS THE KEY CHANGE

  // --- 2. THE AUTOCOMPLETE HANDLER ---
  // This new function runs when Discord asks for a list of choices.
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const players = await db.getAllTrackedPlayers();

    // Create a list of choices from the database
    const choices = players.map((player) => ({
      name: `${player.gameName}#${player.tagLine}`, // What the user sees
      value: String(player.id), // What the bot receives (the database ID)
    }));

    // Filter choices based on what the user is typing
    const filtered = choices.filter((choice) =>
      choice.name.toLowerCase().startsWith(focusedValue.toLowerCase())
    );

    await interaction.respond(filtered.slice(0, 25)); // Respond with up to 25 choices
  },

  // --- 3. THE EXECUTION LOGIC ---
  // This now uses the database ID to delete the player.
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // The 'player' option now contains the database ID from the autocomplete 'value'
    const playerIdToDelete = interaction.options.getString("player");

    // We can add a check to make sure the ID is valid if needed, but it's generally safe
    const result = await db.deletePlayerById(playerIdToDelete);

    if (result.changes > 0) {
      await interaction.editReply(
        "Successfully removed the player from the tracking list."
      );
    } else {
      await interaction.editReply(
        "Could not find that player in the list. They may have already been removed."
      );
    }
  },
};
