import { Service, Inject, Container } from 'typedi'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { PairInfoEntity, Recent24hEntity } from 'orm'
import { Volume24h } from 'graphql/schema'
import { TokenService } from './TokenService'

@Service()
export class Volume24hService {
  constructor(
    @InjectRepository(Recent24hEntity) private readonly repo: Repository<Recent24hEntity>,
    @InjectRepository(PairInfoEntity) private readonly pairRepo: Repository<PairInfoEntity>,
    @Inject((type) => TokenService) private readonly tokenService: TokenService
  ) {}

  async getTokenInfo(
    pair: string,
    repo = this.repo,
    pairRepo = this.pairRepo
  ): Promise<void | Volume24h> {
    const recent = await repo.find({ where: { pair } })
    const pairInfo = await pairRepo.findOne({ where: { pair } })
    if (!pairInfo) return
    if (!recent[0])
      return {
        pairAddress: pair,
        token0: await this.tokenService.getTokenInfo(pairInfo.token0),
        token1: await this.tokenService.getTokenInfo(pairInfo.token1),
        token0Volume: '0',
        token1Volume: '0',
        volumeUST: '0',
      }

    const token0 = await this.tokenService.getTokenInfo(recent[0].token0)
    const token1 = await this.tokenService.getTokenInfo(recent[0].token1)
    return {
      pairAddress: pair,
      token0,
      token1,
      token0Volume: sumVolume(Key.token0Volume, recent).toString(),
      token1Volume: sumVolume(Key.token1Volume, recent).toString(),
      volumeUST: sumVolume(Key.volumeUST, recent).toString(),
    }
  }

  async getTokensInfo(repo = this.repo, pairRepo = this.pairRepo): Promise<Volume24h[]> {
    const pairList = await pairRepo.find()
    const result: Volume24h[] = []
    for (const pair of pairList) {
      const tokenInfo = await this.getTokenInfo(pair.pair)
      if (tokenInfo) result.push(tokenInfo)
    }

    return result
  }
}

function sumVolume(key: Key, recentData: Recent24hEntity[]) {
  let sum = 0
  for (const tx of recentData) {
    sum += Number(tx[key])
  }
  return sum
}

enum Key {
  token0Volume = 'token0Volume',
  token1Volume = 'token1Volume',
  volumeUST = 'volumeUst',
}

export function volume24hService(): Volume24hService {
  return Container.get(Volume24hService)
}
