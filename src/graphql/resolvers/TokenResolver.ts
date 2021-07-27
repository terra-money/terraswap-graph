import { Arg, Query, Resolver } from 'type-graphql'
import { Token } from 'graphql/schema'
import { TokenService } from 'services'

@Resolver((of) => Token)
export class TokenResolver {
  constructor(private readonly tokenService: TokenService) {}

  @Query((returns) => Token)
  async tokenInfo(@Arg('tokenAddress') tokenAddress: string): Promise<Token> {
    return await this.tokenService.getTokenInfo(tokenAddress)
  }

  @Query((returns) => [Token])
  async tokenInfos(): Promise<Token[]> {
    return await this.tokenService.getTokenInfos()
  }
}
