// system file, please don't modify it

import pg from "pg"
import * as orm from "@ghom/orm"
import * as logger from "./logger.ts"
import env from "./env.ts"
import path from "path"

setTypeParsers()

const client = new orm.ORM({
  tableLocation: path.join(process.cwd(), "dist", "tables"),
  backups: {
    location: path.join(process.cwd(), "data", "backups"),
  },
  database: {
    client: "pg",
    useNullAsDefault: true,
    connection: {
      port: env.DB_PORT ?? 5432,
      host: env.DB_HOST ?? "localhost",
      user: env.DB_USER ?? "postgres",
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE ?? "postgres",
      timezone: env.BOT_TIMEZONE || "UTC",
    },
  },
  logger,
})

export * from "@ghom/orm"

export default client

function setTypeParsers() {
  const int = (value: string) => parseInt(value)
  const float = (value: string) => parseFloat(value)

  pg.types.setTypeParser(pg.types.builtins.INT2, int)
  pg.types.setTypeParser(pg.types.builtins.INT4, int)
  pg.types.setTypeParser(pg.types.builtins.INT8, int)
  pg.types.setTypeParser(pg.types.builtins.FLOAT4, float)
  pg.types.setTypeParser(pg.types.builtins.FLOAT8, float)
}
