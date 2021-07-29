import { Arg, Query, Resolver } from 'type-graphql'
import { Service } from 'typedi'
import { Token } from 'graphql/schema'
import { TokenService } from 'services'

@Service()
@Resolver((of) => Token, { isAbstract: true })
export class TokenResolver {
  constructor(private readonly tokenService: TokenService) {}

  @Query((returns) => Token)
  async tokenInfo(@Arg('tokenAddress') tokenAddress: string): Promise<Token> {
    return this.tokenService.getTokenInfo(tokenAddress)
  }

  @Query((returns) => [Token])
  async tokenInfos(): Promise<Token[]> {
    return this.tokenService.getTokenInfos()
  }
}
