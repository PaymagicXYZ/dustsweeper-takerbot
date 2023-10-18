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
  botSettings: {
    conractAddress: '0xb09582787Be1C764C7A15bfF032e133691a5b435',
    refreshInterval: 60 * 1, // 1 minute
    fromBlock: 18192415 - 8*224688,
    chunkSizeForPreparation: 10,
    chunkSizeForTokenMonitoring: 50,
    maxMakersLengthToJoin: 5,
    turnOnExecution: true, // change after frontrunning is resolved
    maxChunkCount: 3, // lambda limitations
    skipGasNotProfitSweeps: process.env.SKIP_GAS_NOT_PROFIT_SWEEPS === 'true', 
    maxBoundOnGasLost:  BigInt(0.001 * 10 ** 18), // (0.001 ETH) if skipGasNotProfitSweeps is true, this is the max gas lost to consider a sweep profitable
  },
  flashbots: {
    flashbotsAuthSignerPK: process.env.FLASHBOTS_AUTH_SIGNER,
  }
}
