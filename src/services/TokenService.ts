import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Container, Service } from 'typedi'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { TokenInfoEntity } from 'orm'
import { Token } from 'graphql/schema'
import { whiteList } from 'assets/whiteList'

const whiteListToken: { [key: string]: string } = whiteList.token

@Service()
export class TokenService {
  constructor(
    @InjectRepository(TokenInfoEntity) private readonly repo: Repository<TokenInfoEntity>
  ) {}

  @memoize({ promise: true, maxAge: 3600000, primitive: true, length: 1 })
  async getToken(token: string, repo = this.repo): Promise<Token> {
    const tokenInfo = await repo.findOne({ where: { tokenAddress: token } })

    if (!tokenInfo || !whiteListToken[token]) return undefined

    return {
      tokenAddress: token,
      symbol: tokenInfo?.symbol,
      includedPairs: tokenInfo?.pairs,
    }
  }

  async getTokens(tokens?: string[]): Promise<Token[]> {
    if (!tokens){
      tokens = []
      const tokenInfos = await this.getAllTokensData()
      for (const tokenInfo of tokenInfos) {
        if (whiteListToken[tokenInfo.tokenAddress]){
          tokens.push(tokenInfo.tokenAddress)
        }
      }
    }

    return bluebird
      .map(tokens, async (token) => this.getToken(token))
      .filter(Boolean)
  }

  //10 minute cache
  @memoize({ promise: true, maxAge: 600000, primitive: true, length: 0 })
  async getAllTokensData(): Promise<TokenInfoEntity[]>{
    return this.repo.find()
  }
}

export function tokenService(): TokenService {
  return Container.get(TokenService)
}
