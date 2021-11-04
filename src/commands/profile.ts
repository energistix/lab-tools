import * as app from "../app.js"

import users from "../tables/users.js"
import { Messages } from "../tables/messages"
import { graphicalNote, userNote } from "../tables/note.js"

export default new app.Command({
  name: "profile",
  description: "The profile command",
  channelType: "guild",
  aliases: ["user", "about"],
  positional: [
    {
      name: "user",
      description: "Targeted user",
      castValue: "user+",
      default: (message) => message?.author.id as string,
    },
  ],
  async run(message) {
    const config = await app.getConfig(message.guild, true)
    const user: app.User = message.args.user
    const userData = await users.query.where({ id: user.id }).first()
    const { output: messageCount } = (
      await app.db.raw(`
        select sum(\`count\`) as output
        from messages
        where author_id = ${user.id}
    `)
    )[0]

    let presentation: app.Message | null = null

    if (config.presentation_channel_id && userData?.presentation_id) {
      const presentationChannel = await message.guild.channels.fetch(
        config.presentation_channel_id,
        {
          force: true,
          cache: false,
        }
      )

      if (presentationChannel?.isText())
        presentation = await presentationChannel.messages.fetch(
          userData.presentation_id
        )
    }

    const { count, avg } = await userNote(user)

    return message.send({
      embeds: [
        new app.SafeMessageEmbed()
          .setColor()
          .setAuthor(
            `Profile of ${user.tag}`,
            user.displayAvatarURL({ dynamic: true, size: 32 })
          )
          .setDescription(presentation?.content || "*No presentation found*")
          .addField(
            `Note (${count ?? 0} notes)`,
            `${graphicalNote(avg)} **${avg?.toFixed(2) ?? 0}** / 5`,
            true
          )
          .addField(
            "Some stats",
            app.code.stringify({
              lang: "yml",
              format: { printWidth: 62 },
              content: `messages: ${messageCount}`,
            })
          ),
      ],
    })
  },
})
