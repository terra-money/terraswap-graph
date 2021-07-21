import { initMantle } from './lib/terra'
import { collect } from './collector/collect'
import { initORM } from './orm'

process.on('unhandledRejection', (error) => {
  console.log(error)
})

const main = async () => {
  await initORM()
  initMantle('https://mantle.terra.dev/')
  for (;;) {
    await collect()
  }
}

main().catch(console.log)
