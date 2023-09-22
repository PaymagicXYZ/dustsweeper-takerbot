import { ethers } from 'ethers'
import axios from 'axios'

import DustSweeper from './abis/DustSweeper.json'
import ERC20 from './abis/ERC20.json'
import config from './config'
import { PreparedCallDataT } from './types'
import { provider } from './network'
import { prepareSwapData } from './utils/oneinchSwap'

const priceApiUrl = config.paymagic.priceApiUrl
const dustSweeperAddress = config.paymagic.dustSweeperAddress

export const prepareExecute = async (tokenAddressesWithMakers: {tokenAddress: string, makers: string[]}[], botContractAddress: string, senderAddress: string): Promise<PreparedCallDataT[]> => {
  console.log('prepareExecute')
  let apiResponse;
  try {
    apiResponse = await axios.post(priceApiUrl, {
      tokenAddresses: tokenAddressesWithMakers.map((tokenAddressWithMakers) => tokenAddressWithMakers.tokenAddress)
    })
  } catch (err) {
    throw new Error(`Fetch price API fatal error: ${err.message}`);
  }
  const prices = apiResponse.data.data;
  const packet = apiResponse.data.packet;
  
  const dustSweeperContract = new ethers.Contract(dustSweeperAddress, DustSweeper.abi, provider)

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
    
    let totalTokenAmount = 0n;

    for (const maker of tokenAddressWithMakers.makers) {
      const allowance = await tokenContract.allowance(maker, dustSweeperAddress);
      const balance = await tokenContract.balanceOf(maker);
      const amount = balance < allowance ? balance : allowance;
      totalTokenAmount = totalTokenAmount + amount;
      const totalPrice = quotePrice * (BigInt(amount)) / (powDecimals);
      const discountedPrice = totalPrice * (powPercent - takerPercent) / powPercent;
      const protocolTotal = totalPrice * (protocolPercent) / (powPercent);
      totalEthSend = totalEthSend + discountedPrice + protocolTotal;
      if (totalEthSend > 0n) {
        tokenAddressesForSC.push(tokenAddress)
        makersForSC.push(maker)
      }
    }
    // sender's balance of eth
    const senderEthBalance = await provider.getBalance(senderAddress)
    
    if (totalEthSend > 0n && totalEthSend < senderEthBalance) {
      const swapData = await prepareSwapData(tokenAddress, totalTokenAmount.toString(), botContractAddress, senderAddress)
      if (swapData) {
        preparedCallData.push({
          makersForSC,
          tokenAddressesForSC,
          packet,
          value: totalEthSend.toString(),
          ...swapData
        })
      }
    } else {
      console.log(`totalEthSend is 0, no sweeps today for token ${tokenAddress}`)
    }

  }

  return preparedCallData
}
