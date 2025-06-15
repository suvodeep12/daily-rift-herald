const { SlashCommandBuilder } = require("discord.js");
const db = require("../core/database.js");
const { getRankedData } = require("../core/riot-api.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("track")
    .setDescription("Starts tracking a League of Legends player.")
    .addStringOption((option) =>
      option
        .setName("riot_id")
        .setDescription("The Riot ID of the player (e.g., PlayerName#TAG)")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const riotId = interaction.options.getString("riot_id");
    if (!riotId.includes("#")) {
      return interaction.editReply(
        "Error: Invalid Riot ID. Please use the format `PlayerName#TagLine`."
      );
    }

    const [gameName, tagLine] = riotId.split("#");
    const region = "sg2";

    const initialData = await getRankedData(gameName, tagLine);

    if (!initialData.success) {
      return interaction.editReply(
        `Could not fetch data for **${gameName}#${tagLine}**. The player may not exist or the Riot API may be down.`
      );
    }

    // --- THIS IS THE NEW ERROR HANDLING BLOCK ---
    try {
      await db.addOrUpdatePlayer(
        gameName,
        tagLine,
        region,
        initialData.puuid,
        initialData.lp,
        initialData.tier,
        initialData.rank
      );
      await interaction.editReply(
        `Successfully added **${gameName}#${tagLine}** to the tracking list!`
      );
    } catch (error) {
      // Check if the error is a UNIQUE constraint violation
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        await interaction.editReply(
          `**${gameName}#${tagLine}** is already on the tracking list.`
        );
      } else {
        // For any other unexpected errors
        console.error("Error adding player to database:", error);
        await interaction.editReply(
          "An unexpected error occurred while trying to add the player to the database."
        );
      }
    }
    // ------------------------------------------
  },
};
