import memoize from 'memoizee-decorator'
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

  @memoize({ promise: true, maxAge: 600000, primitive: true, length: 1 })
  async getVolume24h(
    pair: string,
    repo = this.repo,
    pairRepo = this.pairRepo
  ): Promise<void | Volume24h> {
    const recent = await repo.find({ where: { pair } })
    const pairInfo = await pairRepo.findOne({ where: { pair } })
    if (!pairInfo) return
    if (!recent[0]){
      return {
        token0Volume: '0',
        token1Volume: '0',
        volumeUST: '0',
      }
    }
    
    return {
      token0Volume: sumVolume(Key.TOKEN_0_VOLUME, recent).toString(),
      token1Volume: sumVolume(Key.TOKEN_1_VOLUME, recent).toString(),
      volumeUST: sumVolume(Key.VOLUME_UST, recent).toString(),
    }
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
  TOKEN_0_VOLUME = 'token0Volume',
  TOKEN_1_VOLUME = 'token1Volume',
  VOLUME_UST = 'volumeUst',
}

export function volume24hService(): Volume24hService {
  return Container.get(Volume24hService)
}
