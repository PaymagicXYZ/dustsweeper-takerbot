import { APIGatewayEvent, Context } from 'aws-lambda'
import { S3 } from 'aws-sdk'

import config from './src/config'
import { cron } from './src/utils/cron'
import { executeSweeps } from './src/main'


const getDataFromS3 = async () => {
  const s3 = new S3()
  const params = {
    Bucket: 'takerbot-data',
    Key: 'data.json'
  }
  const data = await s3.getObject(params).promise()
  return data.Body?.toString('utf-8')
}

const uploadDataToS3 = async (data: any) => {
  const s3 = new S3()
  const params = {
    Bucket: 'takerbot-data',
    Key: 'data.json',
    Body: JSON.stringify(data)
  }
  const res = await s3.putObject(params).promise()
  console.log('res: ', res)
  return res
}

export const handler = async (event: APIGatewayEvent, context: Context): Promise<void> => {
  // get data from s3
  const data = await getDataFromS3()
  const dataJson = JSON.parse(data || '{}')
  
  console.log('starting taker bot')
  const lastTokenChunk = await executeSweeps(dataJson.lastTokenChunk || 0)
  
  // upload data to s3
  await uploadDataToS3({lastTokenChunk})
}

// run this when executing locally or in a container (not as lambda function)
export const startTakerBot = () => cron(config.botSettings.refreshInterval, 'takerBot', executeSweeps)
// startTakerBot()
//   .catch(e => {
  //     console.error(e)
  //     process.exit(1)
  //   })
  