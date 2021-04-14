import * as app from "../app"
import * as prettify from "ghom-prettify"

const command: app.Command = {
  name: "format",
  aliases: ["beautify", "prettier"],
  description: "Format the given code",
  async run(message) {
    const code = app.code.parse(message.rest)

    if (code) {
      const { lang, content } = code

      const prettified = prettify.format(content, lang, {
        semi: false,
        printWidth: 86,
      })

      await message.channel.send(
        app.code.stringify({
          content: prettified,
          lang,
        })
      )
    } else {
      await message.channel.send(
        `${message.client.emojis.resolve(
          app.Emotes.DENY
        )} Bad usage, please use code block tags`
      )
    }
  },
}

module.exports = command