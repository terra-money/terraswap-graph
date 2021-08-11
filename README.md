# Terraswap Graph

## Modules
* ### Indexer
  * Get tx logs from mantle (https://mantle.terra.dev) and store terraswap relative data into the database 
  * Collect hourly/daily reserve, volume and transaction count of each pairs
  * Collect recent 24 hours swap data to serve recent volume
  * Collect minutely exchage rate of each pairs
  * Collect tx_history

## Prerequisites

1. Node.js >= 14.15.x
2. PostgreSQL == 13.x

## Setup 

1. Clone
      ```zsh
      $ git clone https://github.com/terra-money/terraswap-graph.git
      ```
2. Install packages
      ```zsh
      $ npm install
      ```

3. Setup the database
  
    * Install postgreSQL
    * create a database
      ```psql
      postgres => CREATE DATABASE terraswap-graph OWNER alice
      ```


4. set **ormconfig.js**

      ```javascript    
      const { DefaultNamingStrategy } = require('typeorm')
      const { values, snakeCase } = require('lodash')
      const entities = require('orm/entities')

      class CamelToSnakeNamingStrategy extends DefaultNamingStrategy {
        tableName(targetName, userSpecifiedName) {
          return userSpecifiedName ? userSpecifiedName : snakeCase(targetName)
        }
        columnName(propertyName, customName, embeddedPrefixes) {
          return snakeCase(embeddedPrefixes.concat(customName ? customName : propertyName).join('_'))
        }
        columnNameCustomized(customName) {
          return customName
        }
        relationName(propertyName) {
          return snakeCase(propertyName)
        }
      }

      const connectionOptions = {
        host: 'localhost',
        port: 5432,
        username: 'alice',
        password: 'password',
        database: 'terraswap-graph',
      }

      module.exports = [
        {
          name: 'default',
          type: 'postgres',
          synchronize: false,
          migrationsRun: true,
          logging: false,
          logger: 'file',
          migrations: ['src/orm/migrations/*.ts'],
          ...connectionOptions,
        },
        {
          name: 'migration',
          type: 'postgres',
          synchronize: false,
          migrationsRun: true,
          logging: true,
          logger: 'file',
          supportBigNumbers: true,
          bigNumberStrings: true,
          entities: values(entities),
          migrations: ['src/orm/migrations/*.ts'],
          namingStrategy: new CamelToSnakeNamingStrategy(),
          ...connectionOptions,
        },
      ]
      ```

5. Set .envrc
    
    about .envrc - https://direnv.net/
    
    .envrc (sample)
      ```
      TZ='UTC'
      
      export TERRA_LCD='https://lcd.terra.dev'
      export TERRA_CHAIN_ID='columbus-4'
      export TERRA_MANTLE='https://mantle.terra.dev'

      export START_BLOCK_HEIGHT=549000
      ```

## Run Modules

* ### Collector
    ```zsh
    $ npm run collect
    ```

* ### GraphQL
    ```zsh
    $ npm start
    ```