import { map } from 'bluebird'
import {
  Connection,
  createConnection,
  ConnectionOptions,
  ConnectionOptionsReader,
  useContainer,
} from 'typeorm'
import { Container } from 'typedi'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { values } from 'lodash'
import * as logger from 'lib/logger'
import * as entities from './entities'
import CamelToSnakeNamingStrategy from './utils/namingStrategy'

export const staticOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
}

let connections: Connection[] = []

function initConnection(options: ConnectionOptions): Promise<Connection> {
  const pgOpts = options as PostgresConnectionOptions
  logger.info(
    `Connecting to ${pgOpts.username}@${pgOpts.host}:${pgOpts.port || 5432} (${
      pgOpts.name || 'default'
    })`
  )

  return createConnection({
    ...options,
    ...staticOptions,
    entities: values(entities),
    namingStrategy: new CamelToSnakeNamingStrategy(),
  })
}

export async function initORM(): Promise<Connection[]> {
  logger.info('Initialize ORM')

  useContainer(Container)

  const reader = new ConnectionOptionsReader()
  const options = (await reader.all()).filter((o) => o.name !== 'migration')

  const { TYPEORM_HOST, TYPEORM_HOST_RO, TYPEORM_USERNAME, TYPEORM_PASSWORD, TYPEORM_DATABASE } =
    process.env

  if (TYPEORM_HOST_RO) {
    const replicaOptions = options.map((option) => ({
      ...option,
      replication: {
        master: {
          host: TYPEORM_HOST,
          username: TYPEORM_USERNAME,
          password: TYPEORM_PASSWORD,
          database: TYPEORM_DATABASE,
        },
        slaves: [
          {
            host: TYPEORM_HOST_RO,
            username: TYPEORM_USERNAME,
            password: TYPEORM_PASSWORD,
            database: TYPEORM_DATABASE,
          },
        ],
      },
    }))

    connections = await map(replicaOptions, (opt) => initConnection(opt))
  } else {
    connections = await map(options, (opt) => initConnection(opt))
  }

  return connections
}

export async function getConnectionOption(name?: string): Promise<ConnectionOptions> {
  const reader = new ConnectionOptionsReader()
  const options = await reader.all()
  const option = name ? options.find((o) => o.name === name) : options[0]
  if (!option) {
    throw new Error(`can not find connection option '${name}'`)
  }

  return option
}

export function getConnections(): Connection[] {
  return connections
}

export async function finalizeORM(): Promise<void[]> {
  return Promise.all(connections.map((c) => c.close()))
}
