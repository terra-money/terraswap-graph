/* tslint: disable */
import { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { GraphQLRequestContext } from 'apollo-server-types'
import { GraphQLRequestListener } from 'apollo-server-plugin-base/src/index'
import { OperationDefinitionNode } from 'graphql'
import { get } from 'lodash'
import * as logger from 'lib/logger'

function operationToLog(operation: OperationDefinitionNode): string {
  return (operation.selectionSet?.selections || [])
    .map((selection) => get(selection, 'name.value'))
    .filter(Boolean)
    .join(',')
}

export const myDebugLoggerPlugin: ApolloServerPlugin = {
  async requestDidStart<MyApolloContext >(
    requestContext: GraphQLRequestContext<MyApolloContext>,
  ): Promise<GraphQLRequestListener<MyApolloContext >> {
    // const start = performance.now()
    let operation: string | null

    return {
      // Apollo server lifetime methods that you can use. https://www.apollographql.com/docs/apollo-server/integrations/plugins/#responding-to-request-lifecycle-events
      async didResolveOperation(context) {
        operation = context.operationName
      },
      async willSendResponse(context) {
        // const elapsed = Math.round(performance.now() - start)
        // const size = JSON.stringify(context.response).length * 2
        console.log(
          `ApolloServer log: operataion=${operation}`,
        )
      },
      async didEncounterErrors(context) {
        console.log('Did encounter error: ', context)
      },
    }
  },
  // async serverWillStart(_context) {
  //   //
  // },
}

// https://stackoverflow.com/questions/59988906/how-do-i-write-a-apollo-server-plugin-to-log-the-request-and-its-duration
export const GraphQLLogger: ApolloServerPlugin = {
  async requestDidStart<TContext>(
    requestContext: GraphQLRequestContext<TContext>
  ): Promise<GraphQLRequestListener<TContext>> {
    const start = Date.now()

    return {
      async didResolveOperation(context) {
      // async didResolveOperation(context) {
        if (context.operationName === 'IntrospectionQuery') {
          return
        }

        const { operation, queryHash } = context

        const variables = context.request?.variables
          ? `: ${JSON.stringify(context.request?.variables)}`
          : ''

        logger.info(`${queryHash.substr(-6)} ${operation?.operation} ${operationToLog(operation)}${variables}`)
      },

      async didEncounterErrors(context): Promise<void> {
        const { operation, queryHash, errors } = context

        logger.info(`${queryHash.substr(-6)} ${operation?.operation} error: ${JSON.stringify(errors)}`)
      },

      async willSendResponse(context): Promise<void> {
        if (context.operationName === 'IntrospectionQuery') {
          return
        }

        const { operation, queryHash } = context

        const elapsed = Date.now() - start
        const size = JSON.stringify(context.response).length * 2

        logger.info(`${queryHash.substr(-6)} ${operation?.operation} response: duration=${elapsed}ms bytes=${size}`)
        if (+elapsed > 10000) {
          logger.info(`${queryHash.substr(-6)} ${JSON.stringify(context.request.query)}`)
        }
      }
    }
  },
}
