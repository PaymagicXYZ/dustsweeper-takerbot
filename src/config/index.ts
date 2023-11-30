import dotenv from 'dotenv'
dotenv.config()

export default {
  paymagic: {
    dustSweeperAddress: '0x78106f7db3EbCEe3D2CFAC647f0E4c9b06683B39',
    priceApiUrl: 'https://api.paymagic.xyz/v1/utils/fetchTrustedPrices',
  },
  providerUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  privateKey: process.env.PK,
  oneinch: {
    eth_1inch_address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    apiBaseUrl: 'https://api.1inch.dev/swap/v5.2/1',
    api_key: process.env.ONEINCH_API_KEY
  },
  coingecko: {
    apiBaseUrl: 'https://api.coingecko.com/api/v3',
  },
  botSettings: {
    conractAddress: '0xb09582787Be1C764C7A15bfF032e133691a5b435',
    refreshInterval: 60 * 1, // 1 minute
    chunkSizeForPreparation: 10,
    chunkSizeForTokenMonitoring: 50,
    maxMakersLengthToJoin: 5,
    turnOnExecution: true, // change after frontrunning is resolved
    maxChunkCount: 3, // lambda limitations
    skipGasNotProfitSweeps: process.env.SKIP_GAS_NOT_PROFIT_SWEEPS === 'true', 
    alwaysUseFlashbots: process.env.ALWAYS_USE_FLASHBOTS === 'true',
    maxBoundOnGasLost:  BigInt(Number(process.env.MAX_BOUND_ON_GAS_LOST || 0.001) * 10 ** 18), // (0.001 ETH) if skipGasNotProfitSweeps is true, this is the max gas lost to consider a sweep profitable
  },
  s3:{
    bucketName: process.env.S3_BUCKET_NAME || 'takerbot-data',
    key: process.env.S3_KEY || 'data.json',
  },
  flashbots: {
    flashbotsAuthSignerPK: process.env.FLASHBOTS_AUTH_SIGNER,
  }
}
