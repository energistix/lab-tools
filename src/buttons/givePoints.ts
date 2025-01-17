import * as app from "#app"
import points from "#tables/point.ts"
import helping from "#tables/helping.ts"

export default new app.Button<{
  targetId: string
  amount: number
}>({
  name: "givePoints",
  description: "Gives some helping points to a user",
  guildOnly: true,
  builder: (builder) => builder.setEmoji("👍"),
  async run(interaction, { targetId, amount }) {
    if (!interaction.channel?.isThread()) return

    await interaction.deferReply({ ephemeral: true })

    const guild = await app.getGuild(interaction.guild!, { forceExists: true })

    if (!guild.help_forum_channel_id) return
    if (interaction.channel.parentId !== guild.help_forum_channel_id) return

    const fromId = interaction.user.id

    if (fromId === targetId)
      return await interaction.editReply({
        content: `${app.emote(
          interaction,
          "Cross",
        )} You can't give points to yourself.`,
      })

    const topic = interaction.channel

    if (fromId !== topic.ownerId)
      return await interaction.editReply({
        content: `${app.emote(interaction, "Cross")} You can't give points to a user in a topic that you don't own.`,
      })

    const fromUser = await app.getUser({ id: fromId }, true)
    const toUser = await app.getUser({ id: targetId }, true)

    await points.query.insert({
      from_id: fromUser._id,
      to_id: toUser._id,
      amount: +amount,
      created_at: new Date().toISOString(),
    })

    await app.sendLog(
      interaction.guild!,
      `${interaction.user} gave **${amount}** points to ${app.userMention(targetId)} in ${interaction.channel}.`,
    )

    await interaction.editReply({
      content: `${app.emote(interaction, "CheckMark")} Successfully thanked ${app.userMention(
        targetId,
      )}`,
    })

    const target = await interaction.client.users.fetch(targetId, {
      cache: false,
      force: true,
    })

    await target.send(
      `${app.emote(
        interaction,
        "CheckMark",
      )} You received **${amount}** points from ${interaction.user} in ${
        interaction.channel
      }.`,
    )

    const state = await helping.query
      .where("id", interaction.channel.id)
      .first()

    await helping.query.where("id", interaction.channel.id).update({
      rewarded_helper_ids:
        state && state.rewarded_helper_ids !== ""
          ? [...state.rewarded_helper_ids.split(";"), targetId].join(";")
          : targetId,
    })

    await app.refreshHelpingFooter(interaction.channel)
  },
})
