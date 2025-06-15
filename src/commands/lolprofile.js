const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getRankedData } = require("../core/riot-api.js");
const config = require("../config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lolprofile")
    .setDescription("Fetches the current rank and profile of a player.")
    .addStringOption((option) =>
      option
        .setName("riot_id")
        .setDescription("The Riot ID of the player (e.g., PlayerName#TAG)")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const riotId = interaction.options.getString("riot_id");
    if (!riotId.includes("#")) {
      return interaction.editReply(
        "Error: Invalid Riot ID format. Please use `PlayerName#TagLine`."
      );
    }

    const [gameName, tagLine] = riotId.split("#");
    const data = await getRankedData(gameName, tagLine);

    if (!data.success) {
      return interaction.editReply(
        `Could not fetch data for **${riotId}**. Player may not exist.`
      );
    }

    const currentRank =
      data.tier === "UNRANKED" ? "Unranked" : `${data.tier} ${data.rank}`;
    const opggLink = `https://op.gg/summoners/sg/${encodeURIComponent(
      gameName
    )}-${tagLine}`;
    const iconURL = `http://ddragon.leagueoflegends.com/cdn/${config.LOL_VERSION}/img/profileicon/${data.profileIconId}.png`;

    const embed = new EmbedBuilder()
      .setColor(config.EMBED_COLORS.info)
      .setTitle(`Profile for ${gameName}#${tagLine}`)
      .setURL(opggLink)
      .setThumbnail(iconURL)
      .addFields(
        { name: "Current Rank", value: `**${currentRank}**` },
        { name: "League Points", value: `${data.lp} LP` }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
