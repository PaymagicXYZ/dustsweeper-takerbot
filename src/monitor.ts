import { ethers } from 'ethers'
import axios from 'axios'

import ERC20 from './abis/ERC20.json'
import config from './config'
import { TokenAddressWithMakersT } from './types'
import { provider } from './network'

export const getAllAvailableTokens = async (): Promise<{address: string, symbol: string}[]> => {
  console.log('getting all available tokens...')
  // get all of the erc20 tokens from coingecko
  const tokens = await axios.get(`${config.coingecko.apiBaseUrl}/coins/list?include_platform=true`)
  const allEthTokens = tokens.data.map((token: any) => (token.platforms && token.platforms.ethereum) ? {address: token.platforms.ethereum, symbol: token.symbol} : null).filter((token: any) => token !== null)
  
  console.log('total eth tokens length: ', allEthTokens.length)
  return allEthTokens
}

export const monitorAvailableOrders = async (allEthTokens: {address: string, symbol: string}[], fromBlock?: number, toBlock?: number, maxPossibleOrders?: number): Promise<TokenAddressWithMakersT[]> => {
  console.log('monitoring available orders...')
  const possibleOrders: {token: {address: string, symbol: string}, events: ethers.Event[]}[] = []
  for (const token of allEthTokens) {
    const tokenContract = new ethers.Contract(token.address, ERC20.abi, provider)
    const eventFilter = tokenContract.filters.Approval(null, config.paymagic.dustSweeperAddress)
    const events = await tokenContract.queryFilter(eventFilter, fromBlock || 0, toBlock || 'latest') as ethers.Event[]
    if (events.length > 0) {
      possibleOrders.push({
        token,
        events
      })
    }

    if (maxPossibleOrders && possibleOrders.length >= maxPossibleOrders) {
      break
    }
  }

  return possibleOrders.map((order) => ({
    token: order.token, 
    makers: order.events.map((event) => (event.args![0]))
  }))
}