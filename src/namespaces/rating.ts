import * as app from "../app.js"

import table from "../tables/rating.js"

export interface RatingLadderLine {
  target: string
  score: number
  rank: number
  rating_count: number
}

const mineRatingCount = 5

export function renderNoteValue(score: number) {
  return `**${score.toFixed(2).replace(/0+$/, "")}**`
}

export function renderRating(rating?: number) {
  const full = "▰"
  const empty = "▱"
  const round = Math.round(rating ?? 0)
  return full.repeat(round) + empty.repeat(5 - round)
}

export const ratingLadder = (guild_id?: number) =>
  new app.Ladder<RatingLadderLine>({
    title: "Rating",
    async fetchLines(options) {
      const query = table.query
        .count({ rating_count: "from_id" })
        .select([
          "user.id as target",
          app.orm.raw("rank() over (order by avg(value) desc) as rank"),
          app.orm.raw("avg(value)::float as score"),
        ])
        .leftJoin("user", "note.to_id", "user._id")
        .groupBy("user.id")
        .having(app.orm.raw("count(from_id)"), ">=", mineRatingCount)
        .where("user.is_bot", false)

      if (guild_id) query.and.where("guild_id", guild_id)

      return query
        .orderBy("score", "desc")
        .limit(options.pageLineCount)
        .offset(options.pageIndex * options.pageLineCount) as any
    },
    async fetchLineCount() {
      const query = table.query
        .leftJoin("user", "note.to_id", "user._id")
        .where("user.is_bot", "=", false)

      if (guild_id) query.and.where("guild_id", guild_id)

      return app.countOf(
        query
          .groupBy("user._id")
          .having(app.orm.raw("count(*)"), ">=", mineRatingCount),
      )
    },
    formatLine(line) {
      return `${app.formatRank(line.rank)} ${renderRating(
        line.score,
      )} ${renderNoteValue(line.score)} / 5 <@${line.target}>`
    },
  })

export async function userRating(
  user: { id: string },
  guild?: { id: string },
): Promise<{
  avg: number
  count: number
}> {
  const { _id: userId } = await app.getUser(user, true)

  const query = table.query.where("to_id", userId)

  if (guild) {
    const { _id: guildId } = await app.getGuild(guild, true)

    query.and.where("guild_id", guildId)
  }

  return await query
    .avg({ score: "value" })
    .count({ rating_count: "*" })
    .first()
    .then((result) => ({
      avg: Number(result?.score ?? 0),
      count: Number(result?.rating_count ?? 0),
    }))
}

export async function ratingEmbed(target: app.GuildMember) {
  const rating = await userRating(target, target.guild)
  const globalRating = await userRating(target)

  const externalRating = (
    await Promise.all(
      target.client.guilds.cache
        .filter(
          (guild) =>
            guild.id !== target.guild.id && guild.members.cache.has(target.id),
        )
        .map((guild) => userRating(target, guild)),
    )
  ).filter((rating) => rating.count > 0)

  return new app.EmbedBuilder()
    .setAuthor({
      name: `Rating of ${target.user.tag}`,
      iconURL: target.displayAvatarURL(),
    })
    .setDescription(
      `${renderRating(globalRating.avg)} **${renderNoteValue(
        globalRating.avg,
      )}** / 5`,
    )
    .addFields(
      [
        {
          name: target.guild.name,
          value: `${renderRating(rating.avg)} ${renderNoteValue(
            rating.avg,
          )} / 5 (x${rating.count})`,
        },
        externalRating.length > 0
          ? {
              name: "External ratings",
              value: externalRating
                .map(
                  (rating) =>
                    `${renderRating(rating.avg)} ${renderNoteValue(
                      rating.avg,
                    )} / 5 (x${rating.count})`,
                )
                .join("\n"),
            }
          : null,
      ].filter((field): field is app.EmbedField => !!field),
    )
    .setFooter({ text: `Total: ${globalRating.count ?? 0} ratings` })
}
