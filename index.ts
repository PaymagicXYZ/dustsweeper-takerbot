import config from './src/config'
import { cron } from './src/utils/cron'
import { executeSweeps } from './src/main'

export const startTakerBot = () => cron(config.botSettings.refreshInterval, 'takerBot', executeSweeps)

startTakerBot()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
