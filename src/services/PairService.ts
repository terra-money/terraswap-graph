import { Container, Service, Inject } from 'typedi'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { PairInfoEntity } from 'orm'
import { TokenService } from './TokenService'
import { Pair } from 'graphql/schema'

@Service()
export class PairService {
  constructor(
    @InjectRepository(PairInfoEntity) private readonly repo: Repository<PairInfoEntity>,
    @Inject((type) => TokenService) private readonly tokenService: TokenService
  ) {}

  async getPairInfo(pair: string, repo = this.repo): Promise<Pair> {
    const pairInfo = await repo.findOne({ where: { pair } })
    const token0 = await this.tokenService.getTokenInfo(pairInfo.token0)
    const token1 = await this.tokenService.getTokenInfo(pairInfo.token1)
    return {
      pairAddress: pairInfo.pair,
      token0: token0,
      token1: token1,
      lpTokenAddress: pairInfo.lpToken,
    }
  }

  async getPairList(repo = this.repo): Promise<Pair[]> {
    const pairInfos = await repo.find()
    const result: Pair[] = []
    for (const info of pairInfos) {
      const token0 = await this.tokenService.getTokenInfo(info.token0)
      const token1 = await this.tokenService.getTokenInfo(info.token1)
      result.push({
        pairAddress: info.pair,
        token0: token0,
        token1: token1,
        lpTokenAddress: info.lpToken,
      })
    }

    return result
  }
}

export function pairService(): PairService {
  return Container.get(PairService)
}
