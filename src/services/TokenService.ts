import { Container, Service } from 'typedi'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { TokenInfoEntity } from 'orm'
import { Token } from 'graphql/schema'

@Service()
export class TokenService {
  constructor(
    @InjectRepository(TokenInfoEntity) private readonly repo: Repository<TokenInfoEntity>
  ) {}

  async getTokenInfo(token: string, repo = this.repo): Promise<Token> {
    const tokenInfo = await repo.findOne({ where: { tokenAddress: token } })
    return {
      tokenAddress: tokenInfo.tokenAddress,
      symbol: tokenInfo.symbol,
      includedPairs: tokenInfo.pairs,
    }
  }

  async getTokenInfos(repo = this.repo): Promise<Token[]> {
    const tokenInfos = await repo.find()
    const result: Token[] = []
    for (const info of tokenInfos) {
      result.push({
        tokenAddress: info.tokenAddress,
        symbol: info.symbol,
        includedPairs: info.pairs,
      })
    }

    return result
  }
}

export function tokenService(): TokenService {
  return Container.get(TokenService)
}
