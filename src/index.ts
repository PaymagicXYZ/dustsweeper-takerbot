import config from './config'
import { cron } from './utils/cron'
import { executeSweeps } from './main'

export const startTakerBot = () => cron(config.botSettings.refreshInterval, 'takerBot', executeSweeps)

startTakerBot()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
