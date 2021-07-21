import { DefaultNamingStrategy } from 'typeorm'
import { snakeCase } from 'lodash'

class CamelToSnakeNamingStrategy extends DefaultNamingStrategy {
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ? userSpecifiedName : snakeCase(targetName)
  }

  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return snakeCase(embeddedPrefixes.concat(customName ? customName : propertyName).join('_'))
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName)
  }
}

export default CamelToSnakeNamingStrategy
