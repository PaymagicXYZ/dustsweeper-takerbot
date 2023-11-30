import { ethers } from 'ethers'
import axios from 'axios'

import DustSweeper from './abis/DustSweeper.json'
import ERC20 from './abis/ERC20.json'
import config from './config'
import { PreparedCallDataT, TokenAddressWithMakersT } from './types'
import { provider } from './network'
import { prepareSwapData } from './utils/oneinchSwap'

const priceApiUrl = config.paymagic.priceApiUrl
const dustSweeperAddress = config.paymagic.dustSweeperAddress

export const prepareExecute = async (tokenAddressesWithMakers: TokenAddressWithMakersT[], botContractAddress: string, senderAddress: string): Promise<PreparedCallDataT[]> => {
  console.log('preparing for execution...')
  let apiResponse;
  try {
    apiResponse = await axios.post(priceApiUrl, {
      tokenAddresses: tokenAddressesWithMakers.map((tokenAddressWithMakers) => tokenAddressWithMakers.token.address)
    })
  } catch (err) {
    throw new Error(`Fetch price API fatal error: ${err.message}`);
  }
  const prices = apiResponse.data.data;
  const packet = apiResponse.data.packet;
  
  const dustSweeperContract = new ethers.Contract(dustSweeperAddress, DustSweeper.abi, provider)

  // Calculate ETH send amount
  const protocolPercent = (await dustSweeperContract.protocolFee()).toBigInt();
  const powPercent = 10n ** 4n
  
  const preparedCallData = []
  let totalMakersCount = 0
  let preparedCount = 0

  for (const tokenAddressWithMakers of tokenAddressesWithMakers) {
    let totalEthSend = 0n;
    const tokenAddressesForSC: string[] = []
    const makersForSC: string[] = []
    const tokenAddress = tokenAddressWithMakers.token.address
    const tokenSymbol = tokenAddressWithMakers.token.symbol
    const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi, provider);
    const decimals = await tokenContract.decimals()
    const powDecimals = 10n ** BigInt(decimals)
    const quotePrice = BigInt(prices.pricesWei[prices.tokenArray.indexOf(tokenAddress)])
    const takerDiscountTier = await dustSweeperContract.getTokenTakerDiscountTier(tokenAddress)
    const takerPercent = (await dustSweeperContract.takerDiscountTiers(takerDiscountTier)).toBigInt()

    let totalTokenAmount = 0n;
    totalMakersCount = totalMakersCount + tokenAddressWithMakers.makers.length

    // TODO: granular swap data preparation, not all makers at once
    for (const maker of tokenAddressWithMakers.makers) {
      const allowance = (await tokenContract.allowance(maker, dustSweeperAddress)).toBigInt()
      const balance = (await tokenContract.balanceOf(maker)).toBigInt()
      const amount = balance < allowance ? balance : allowance;
      totalTokenAmount = totalTokenAmount + amount;
      const totalPrice = quotePrice * (amount) / (powDecimals);
      const discountedPrice = totalPrice * (powPercent - takerPercent) / powPercent;
      const protocolTotal = totalPrice * (protocolPercent) / (powPercent);
      totalEthSend = totalEthSend + discountedPrice + protocolTotal;
      if (totalEthSend > 0n && amount > 0n) {
        console.log(`total price for order with ${tokenSymbol}:${tokenAddress} and maker ${maker} with amount ${ethers.utils.formatEther(amount)}ETH is ${ethers.utils.formatEther(totalPrice)}ETH, discounted price is ${ethers.utils.formatEther(discountedPrice)}ETH`)
        tokenAddressesForSC.push(tokenAddress)
        makersForSC.push(maker)
      }
    }
    // sender's balance of eth
    const senderEthBalance = await provider.getBalance(senderAddress)
    
    console.log(`total Token Amount for token ${tokenSymbol}:${tokenAddress} is ${totalTokenAmount}`)

    if (totalEthSend > 0n 
      // && senderEthBalance.gt(totalEthSend) // comment when testing
      ) {
      const swapData = await prepareSwapData(tokenAddress, totalTokenAmount.toString(), botContractAddress, senderAddress)
      if (swapData) {
        console.log(`prepared swapData for token ${tokenSymbol}:${tokenAddress}`)
        preparedCount = preparedCount + makersForSC.length
        preparedCallData.push({
          makersForSC,
          tokenAddressesForSC,
          packet,
          value: totalEthSend.toString(),
          ...swapData
        })
      } else {
        console.log(`Error: swapData is null for token ${tokenSymbol}:${tokenAddress} possible error with swap aggregator`)
      }
    } else {
      console.log(`Error: totalEthSend is ${ethers.utils.formatEther(totalEthSend)}ETH, no sweeps for token ${tokenSymbol}:${tokenAddress} by sender balance ${ethers.utils.formatEther(senderEthBalance)}ETH`)
    }

  }
  console.log(`preparation is ready, total possible orders count is: ${totalMakersCount}`)
  console.log(`successfully prepared orders count is: ${preparedCount}`)

  return preparedCallData
}
