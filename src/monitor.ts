import { ethers } from 'ethers'
import axios from 'axios'

import ERC20 from './abis/ERC20.json'
import config from './config'
import { TokenAddressWithMakersT } from './types'
import { provider } from './network'

export const monitorAvailableOrders = async (fromBlock?: number, toBlock?: number, maxPossibleOrders?: number): Promise<TokenAddressWithMakersT[]> => {
  console.log('monitorAvailableOrders')
  // get all of the erc20 tokens from coingecko
  const tokens = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=true')
  const allEthTokenAddresses = tokens.data.map((token: any) => (token.platforms && token.platforms.ethereum) ? token.platforms.ethereum : null).filter((token: any) => token !== null)
  
  console.log(allEthTokenAddresses.length)

  const possibleOrders: {tokenAddress: string, events: ethers.EventLog[]}[] = []

  for (const tokenAddress of allEthTokenAddresses) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi, provider)
    const eventFilter = tokenContract.filters.Approval(null, config.paymagic.dustSweeperAddress)
    const events = await tokenContract.queryFilter(eventFilter, fromBlock || 0, toBlock || 'latest') as ethers.EventLog[]
    if (events.length > 0) {
      console.log('new possible order! total length: ', possibleOrders.length)
      console.log('tokens processed: ', allEthTokenAddresses.indexOf(tokenAddress), '/', allEthTokenAddresses.length)
      possibleOrders.push({
        tokenAddress,
        events
      })
    }

    if (maxPossibleOrders && possibleOrders.length >= maxPossibleOrders) {
      break
    }
  }

  return possibleOrders.map((order) => ({
    tokenAddress: order.tokenAddress, 
    makers: order.events.map((event) => (event.args![0]))
  }))
}