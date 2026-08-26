import 'reflect-metadata'
import { DataSource, type Repository } from 'typeorm'
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js'
import { config } from '../config.ts'
import { LiveRole, SnapshotRole, User } from '../entities/index.ts'

export interface DbBundle {
  ds: DataSource
  users: Repository<User>
  liveRoles: Repository<LiveRole>
  snapshotRoles: Repository<SnapshotRole>
}

function buildOptions(database: string): PostgresDataSourceOptions {
  return {
    type: 'postgres',
    host: config.postgres.host,
    port: config.postgres.port,
    username: config.postgres.username,
    password: config.postgres.password,
    database,
    entities: [User, LiveRole, SnapshotRole],
    synchronize: true,
    logging: config.postgres.logging,
  }
}

export async function initDb(): Promise<DbBundle> {
  let ds = new DataSource(buildOptions(config.postgres.database))

  try {
    await ds.initialize()
  } catch (err) {
    if (
      !(
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: unknown }).code === '3D000'
      )
    ) {
      throw err
    }
    // Database doesn't exist — connect to the default `postgres` DB and create it.
    const template = new DataSource(buildOptions('postgres'))
    await template.initialize()
    await template.query(`CREATE DATABASE "${config.postgres.database}"`)
    await template.destroy()
    ds = new DataSource(buildOptions(config.postgres.database))
    await ds.initialize()
  }

  return {
    ds,
    users: ds.getRepository(User),
    liveRoles: ds.getRepository(LiveRole),
    snapshotRoles: ds.getRepository(SnapshotRole),
  }
}
