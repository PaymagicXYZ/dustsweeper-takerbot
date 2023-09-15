import { ethers } from 'ethers'
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

import DustSweeper from './abis/DustSweeper.json'
import ERC20 from './abis/ERC20.json'
import config from './config'

const providerUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
const privateKey = process.env.PK

const priceApiUrl = config.priceApiUrl
const dustSweeperAddress = config.dustSweeperAddress

export const prepareExecute = async (tokenAddressesWithMakers: {tokenAddress: string, makers: string[]}[]): Promise<{
  makersForSC: string[],
  tokenAddressesForSC: string[],
  packet: any,
  value: string
}[]> => {
  console.log('prepareExecute')
  let apiResponse;
  try {
    apiResponse = await axios.post(priceApiUrl, {
      tokenAddresses: tokenAddressesWithMakers.map((tokenAddressWithMakers) => tokenAddressWithMakers.tokenAddress)
    })
  } catch (err) {
    throw new Error(`Fetch price API fatal error: ${err.response.data.error}`);
  }
  const prices = apiResponse.data.data;
  const packet = apiResponse.data.packet;
  
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey as string, provider);
  const dustSweeperContract = new ethers.Contract(dustSweeperAddress, DustSweeper.abi, wallet); 

  // Calculate ETH send amount
  const protocolPercent = await dustSweeperContract.protocolFee();
  const powPercent = 10n ** 4n
  
  const preparedCallData = []
  
  for (const tokenAddressWithMakers of tokenAddressesWithMakers) {
    let totalEthSend = 0n;
    const tokenAddressesForSC: string[] = []
    const makersForSC: string[] = []
    const tokenAddress = tokenAddressWithMakers.tokenAddress
    const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi, provider);
    const decimals = await tokenContract.decimals();
    const powDecimals = 10n ** decimals
    const quotePrice = BigInt(prices.pricesWei[prices.tokenArray.indexOf(tokenAddress)])
    const takerDiscountTier = await dustSweeperContract.getTokenTakerDiscountTier(tokenAddress);
    const takerPercent = await dustSweeperContract.takerDiscountTiers(takerDiscountTier);
    
    for (const maker of tokenAddressWithMakers.makers) {
      const allowance = await tokenContract.allowance(maker, dustSweeperAddress);
      const balance = await tokenContract.balanceOf(maker);
      const amount = balance < allowance ? balance : allowance;
      const totalPrice = quotePrice * (BigInt(amount)) / (powDecimals);
      const discountedPrice = totalPrice * (powPercent - takerPercent) / powPercent;
      const protocolTotal = totalPrice * (protocolPercent) / (powPercent);
      totalEthSend = totalEthSend + discountedPrice + protocolTotal;
      if (totalEthSend > 0n) {
        tokenAddressesForSC.push(tokenAddress)
        makersForSC.push(maker)
      }
    }

    console.log(`makersForSC: ${JSON.stringify(makersForSC)}`)
    console.log(`tokenAddressesForSC: ${JSON.stringify(tokenAddressesForSC)}`)
    console.log(`packet: ${JSON.stringify(packet)}`)
    console.log(`totalEthSend formatEther: ${ethers.formatEther(totalEthSend)}`)
    console.log(`totalEthSend: ${totalEthSend}`)
    
    if (totalEthSend > 0n) {
      console.log(`totalEthSend is greater than 0, adding calldata for token ${tokenAddress}`)
      preparedCallData.push({
        makersForSC,
        tokenAddressesForSC,
        packet,
        value: totalEthSend.toString()
      })

    } else {
      console.log(`totalEthSend is 0, no sweeps today for token ${tokenAddress}`)
    }

  }

  return preparedCallData
}

export const monitorAvailableOrders = async () => {
  console.log('monitorAvailableOrders')
  // get all of the erc20 tokens from coingecko
  const tokens = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=true')
  const allEthTokenAddresses = tokens.data.map((token: any) => (token.platforms && token.platforms.ethereum) ? token.platforms.ethereum : null).filter((token: any) => token !== null)
  console.log(allEthTokenAddresses.length)

  const provider = new ethers.JsonRpcProvider(providerUrl);

  const possibleOrders: {tokenAddress: string, events: ethers.EventLog[]}[] = []

  for (const tokenAddress of allEthTokenAddresses) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi, provider)
    const eventFilter = tokenContract.filters.Approval(null, config.dustSweeperAddress)
    // get the last succesful block after which we will start listening for events
    // for now its 0
    // month in blocks = 224688
    // 17613719 block was on Jul-03-2023
    const events = await tokenContract.queryFilter(eventFilter, 0, 'latest') as ethers.EventLog[]
    if (events.length > 0) {
      possibleOrders.push({
        tokenAddress,
        events
      })
    }
    
    // for testing purposes
    /////////////////////////
    if (possibleOrders.length >= 5) {
      break
    }
    /////////////////////////
  }

  return possibleOrders.map((order) => ({tokenAddress: order.tokenAddress, makers: order.events.map((event) => (event.args![0]))}))
}
