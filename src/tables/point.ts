import * as app from "../app.js"

export interface Point {
  to_id: number
  from_id: number
  amount: number
  created_at: string
}

export default new app.Table<Point>({
  name: "point",
  setup: (table) => {
    table
      .integer("to_id")
      .references("_id")
      .inTable("user")
      .onDelete("CASCADE")
      .notNullable()
    table
      .integer("from_id")
      .references("_id")
      .inTable("user")
      .onDelete("CASCADE")
      .notNullable()
    table.integer("amount").unsigned().notNullable()
    app.addCreatedAt(table)
  },
})

const leaderboardPattern = `
  WITH Leaderboard AS (
    SELECT
      u.id AS member_id,
      SUM(p.amount) AS score
    FROM user u
    LEFT JOIN point p ON u._id = p.to_id
    GROUP BY u.id
    ORDER BY score DESC
  )
`

const userRankPattern = `
  SELECT
    member_id,
    score,
    RANK() OVER (ORDER BY score DESC) AS rank
  FROM Leaderboard
`

export async function getLeaderboard(): Promise<
  {
    member_id: string
    score: number
    rank: number
  }[]
> {
  return app.orm.raw(`
    ${leaderboardPattern}
    ${userRankPattern}
    WHERE score > 0
    LIMIT 20
  `)
}

export async function getPersonalRank(memberId: string): Promise<{
  score: number
  rank: number
  member_id: string
}> {
  return app.orm
    .raw(
      `${leaderboardPattern}
      ${userRankPattern}
      WHERE member_id = '${memberId}'`
    )
    .then((result: any) => result[0])
}
