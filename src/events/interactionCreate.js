const { Events } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    if (interaction.isAutocomplete()) {
      if (command.autocomplete) {
        await command.autocomplete(interaction);
      }
    } else if (interaction.isChatInputCommand()) {
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(
          `Error executing command ${interaction.commandName}:`,
          error
        );
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      }
    }
  },
};
