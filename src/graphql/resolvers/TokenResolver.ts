import { Arg, Query, Resolver } from 'type-graphql'
import { Service } from 'typedi'
import { Token } from 'graphql/schema'
import { TokenService } from 'services'
import { ResolverError } from 'lib/error'

@Service()
@Resolver((of) => Token)
export class TokenResolver {
  constructor(private readonly tokenService: TokenService) {}

  @Query((returns) => Token)
  async token(@Arg('tokenAddress', (type) => String) tokenAddress: string): Promise<Token> {
    const token = await this.tokenService.getToken(tokenAddress)
    if (!token) throw new ResolverError('token is not exist')
    return token
  }

  @Query((returns) => [Token])
  async tokens(
    @Arg('tokenAddresses', (type) => [String], { nullable: true }) tokenAddresses?: string[]
  ): Promise<Token[]> {
    return await this.tokenService.getTokens(tokenAddresses)
  }
}
