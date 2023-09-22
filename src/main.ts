import { ethers } from 'ethers'

import { prepareExecute } from './prepareForExecution'
import { monitorAvailableOrders } from './monitor'
import config from "./config";
import { GroupedCallDataT, PreparedCallDataT, TokenAddressWithMakersT } from "./types"
import TakerBotI from './abis/TakerBot.json'
import { provider, wallet } from "./network";
import { TakerBot } from './abis/types';

const takerBotAddress = config.botSettings.conractAddress

let fromBlock = config.botSettings.fromBlock
const monthInBlocks = 224688

export const executeSweeps = async () => {
  let succesfulCount = 0
  const currentBlock = await provider.getBlockNumber()
  if (fromBlock > currentBlock - monthInBlocks) {
    fromBlock = currentBlock - monthInBlocks
  }
  const feeData = await provider.getFeeData()
  const takerBot = new ethers.Contract(takerBotAddress, TakerBotI.abi, provider) as any as TakerBot

  await new Promise(r => setTimeout(r, 1000))

  // balance of wallet in eth
  const walletBalance = await provider.getBalance(wallet.address)

  // monitor
  const tokenAddressesWithMakers = await monitorAvailableOrders(fromBlock, fromBlock + monthInBlocks)

  // split tokenAddressesWithMakers into chunks with size 10
  const chunks: TokenAddressWithMakersT[][] = []
  const chunkSize = config.botSettings.chunkSizeForPreparation
  for (let i = 0; i < tokenAddressesWithMakers.length; i += chunkSize) {
    chunks.push(tokenAddressesWithMakers.slice(i, i + chunkSize))
  }

  const preparedCallData: GroupedCallDataT[] = []
  for (const tokenAddressesWithMakersChunk of chunks) {
    // prepare calldata
    const preparedCallDataChunk = (await prepareExecute(tokenAddressesWithMakersChunk, takerBotAddress, wallet.address)).map((preparedData: PreparedCallDataT) => ({
      ...preparedData,
      uniqueTokenAddresses: [preparedData.tokenAddressesForSC[0]],
      swapData: [preparedData.swapData],
    })) as GroupedCallDataT[]

    preparedCallData.push(...preparedCallDataChunk)
  }

  // group smaller chunks
  const groupedPreparedCallData = preparedCallData.reduce((result, currentElement) => {
    const lastIndex = result.length - 1;
  
    if (
      lastIndex >= 0 &&
      result[lastIndex].makersForSC.length + currentElement.makersForSC.length < config.botSettings.maxMakersLengthToJoin &&
      BigInt(result[lastIndex].value) + BigInt(currentElement.value) < walletBalance/2n
    ) { // TODO: put this in config
      // Merge the elements
      result[lastIndex].makersForSC.push(...currentElement.makersForSC);
      result[lastIndex].tokenAddressesForSC.push(...currentElement.tokenAddressesForSC);
      result[lastIndex].value = String(
        BigInt(result[lastIndex].value) + BigInt(currentElement.value)
      );
      result[lastIndex].swapData.push(...currentElement.swapData);
      result[lastIndex].uniqueTokenAddresses.push(...currentElement.uniqueTokenAddresses);
      result[lastIndex].estimatedSwapReturn = String(
        BigInt(result[lastIndex].estimatedSwapReturn) + BigInt(currentElement.estimatedSwapReturn)
      );
    } else {
      // Add the current element as-is
      result.push(currentElement);
    }
  
    return result;
  }, [] as GroupedCallDataT[]);

  // execute
  for (const groupedPreparedData of groupedPreparedCallData) {
    try {
      console.log('makers length: ', groupedPreparedData.makersForSC.length)
      const value = BigInt(groupedPreparedData.value) + 100n

      const gasEstimate = await takerBot.runSweep.estimateGas(
        groupedPreparedData.makersForSC,
        groupedPreparedData.tokenAddressesForSC,
        groupedPreparedData.packet,
        groupedPreparedData.uniqueTokenAddresses,
        groupedPreparedData.swapData,
        {
          value
        }
      )
      const estimatedReturn = BigInt(groupedPreparedData.estimatedSwapReturn)
      if (!feeData.gasPrice) {
        console.log('no gas price, not executing')
      } else if  (gasEstimate * feeData.gasPrice + value > walletBalance) {
        console.log('not enough eth, not executing')
        console.log('gas + value: ', gasEstimate * feeData.gasPrice + value)
        console.log('walletBalance: ', walletBalance)
      } else if (estimatedReturn - value < gasEstimate * feeData.gasPrice) {
        console.log('gas is larger than profit, not executing')
        console.log('profit: ', estimatedReturn - value)
        console.log('gas: ', gasEstimate * feeData.gasPrice)
      } else {
        console.log('executing')

        if (config.botSettings.turnOnExecution) {
          const sweepTx = await takerBot.connect(wallet).runSweep(
            groupedPreparedData.makersForSC,
            groupedPreparedData.tokenAddressesForSC,
            groupedPreparedData.packet,
            groupedPreparedData.uniqueTokenAddresses,
            groupedPreparedData.swapData,
            {
              value
            }
          )
          console.log("dustSweep txHash: " + sweepTx.hash);
        }
        succesfulCount++
        
        // wait for tx to be mined
        await new Promise(r => setTimeout(r, 3*1000))
        
        // if something left on contract, send it back to owner
        const dustSweeperBalance = await provider.getBalance(takerBotAddress)
        if (dustSweeperBalance > 0n) {
          console.log('dustSweeperBalance: ', dustSweeperBalance)
          const payoutTx = await takerBot.connect(wallet).payoutEth()
          console.log("payout txHash: " + payoutTx.hash);
        }
      }
    } catch (e) {
      console.error(e.message)
    }
  }

  console.log('succesfulCount: ', succesfulCount)
  fromBlock += monthInBlocks
}
