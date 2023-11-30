import { ethers } from 'ethers'

import { prepareExecute } from './prepareForExecution'
import { getAllAvailableTokens, monitorAvailableOrders } from './monitor'
import config from "./config";
import { GroupedCallDataT, PreparedCallDataT, TokenAddressWithMakersT } from "./types"
import TakerBotI from './abis/TakerBot.json'
import { getFlashbotsProvider, provider, wallet } from "./network";
import { TakerBot } from './abis/types';
import { FlashbotsBundleProvider, FlashbotsTransactionResponse } from '@flashbots/ethers-provider-bundle';

const takerBotAddress = config.botSettings.conractAddress


export const executeSweeps = async (lastTokenChunk: number): Promise<number> => {
  let succesfulCount = 0
  const block = await provider.getBlock("latest");
  const feeData = await provider.getFeeData()
  const flashbotsProvider = await getFlashbotsProvider()
  const takerBot = new ethers.Contract(takerBotAddress, TakerBotI.abi, provider) as any as TakerBot
  
  await new Promise(r => setTimeout(r, 1000))
  
  // balance of wallet in eth
  const walletBalance = await provider.getBalance(wallet.address)
  
  const allEthTokens = await getAllAvailableTokens()
  const tokenChunks: {address: string, symbol: string}[][] = []
  const tokenChunkSize = config.botSettings.chunkSizeForTokenMonitoring
  for (let i = 0; i < allEthTokens.length; i += tokenChunkSize) {
    tokenChunks.push(allEthTokens.slice(i, i + tokenChunkSize))
  }

  let currentTokenChunk = lastTokenChunk % tokenChunks.length
  const maxTokenChunk = currentTokenChunk + config.botSettings.maxChunkCount > tokenChunks.length ? tokenChunks.length : currentTokenChunk + config.botSettings.maxChunkCount
  
  while (currentTokenChunk < maxTokenChunk) {
    const tokenChunk = tokenChunks[currentTokenChunk]
    currentTokenChunk++
    try {
      console.log('tokenChunks', tokenChunks.indexOf(tokenChunk) + 1, '/', tokenChunks.length)
      // wait before each chunk for previous txs to be mined
      await new Promise(r => setTimeout(r, 1000))
      
      // if something left on contract, send it back to owner
      const takerBotContractBalance = await provider.getBalance(takerBotAddress)
      if (takerBotContractBalance.toBigInt() > 0n) {
        console.log(`Balance on bot's contract : ${ethers.utils.formatEther(takerBotContractBalance)}ETH`)
        try {
          const payoutTx = await takerBot.connect(wallet).payoutEth()
          console.log("payout txHash: " + payoutTx.hash);
        } catch (e) {
          console.error(e.message)
        }
      }

      // monitor
      const tokenAddressesWithMakers = await monitorAvailableOrders(tokenChunk)
    
      // split tokenAddressesWithMakers into chunks
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
          BigInt(result[lastIndex].value) + BigInt(currentElement.value) < walletBalance.toBigInt()/2n
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
    
      const flashbotsTxs = []
      const PRIORITYFEE = 1000000000n
      const futureBlocksCount = 7

      // execute
      for (const groupedPreparedData of groupedPreparedCallData) {
        try {
          const value = BigInt(groupedPreparedData.value) + 100n
    
          // set analytics by flashbots...
          const gasEstimate = await takerBot.estimateGas.runSweep(
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
          const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas!, futureBlocksCount)
          const flashbotsGasPrice = PRIORITYFEE + maxBaseFeeInFutureBlock.toBigInt()
          if (!flashbotsGasPrice || !feeData.gasPrice) {
            console.log('no gas price, not executing')
          } else if  (gasEstimate.toBigInt() * flashbotsGasPrice + value > walletBalance.toBigInt()) {
            console.log('not enough eth, not executing')
            console.log('gas + value in ETH: ', ethers.utils.formatEther(gasEstimate.toBigInt() * flashbotsGasPrice + value))
            console.log('walletBalance in ETH: ', ethers.utils.formatEther(walletBalance.toBigInt()))
          } else if ((estimatedReturn - value < gasEstimate.toBigInt() * flashbotsGasPrice) && !config.botSettings.skipGasNotProfitSweeps) {
            console.log('gas is larger than profit, not executing')
            console.log('profit in ETH: ', ethers.utils.formatEther(estimatedReturn - value))
            console.log('gas in ETH: ', ethers.utils.formatEther(gasEstimate.toBigInt() * flashbotsGasPrice))
          } else if (config.botSettings.skipGasNotProfitSweeps && config.botSettings.alwaysUseFlashbots && 
            (estimatedReturn - value < gasEstimate.toBigInt() * flashbotsGasPrice) && 
            ((gasEstimate.toBigInt() * flashbotsGasPrice) - (estimatedReturn - value) > config.botSettings.maxBoundOnGasLost)) {
            console.log('gas is larger than acceptable loss, not executing')
            console.log('profit in ETH: ', ethers.utils.formatEther(estimatedReturn - value))
            console.log('gas in ETH: ', ethers.utils.formatEther(gasEstimate.toBigInt() * flashbotsGasPrice))
            console.log('acceptable loss in ETH: ', ethers.utils.formatEther(config.botSettings.maxBoundOnGasLost))
          } else if (config.botSettings.skipGasNotProfitSweeps && !config.botSettings.alwaysUseFlashbots &&
            (estimatedReturn - value < gasEstimate.toBigInt() * flashbotsGasPrice) && 
            ((gasEstimate.toBigInt() * feeData.gasPrice.toBigInt()) - (estimatedReturn - value) > config.botSettings.maxBoundOnGasLost)) {
            console.log('gas is larger than acceptable loss, not executing')
            console.log('profit in ETH: ', ethers.utils.formatEther(estimatedReturn - value))
            console.log('gas in ETH: ', ethers.utils.formatEther(gasEstimate.toBigInt() * feeData.gasPrice.toBigInt()))
            console.log('acceptable loss in ETH: ', ethers.utils.formatEther(config.botSettings.maxBoundOnGasLost))
          } else if (config.botSettings.skipGasNotProfitSweeps && !config.botSettings.alwaysUseFlashbots &&
            ((estimatedReturn - value < gasEstimate.toBigInt() * flashbotsGasPrice) && 
            ((gasEstimate.toBigInt() * feeData.gasPrice.toBigInt()) - (estimatedReturn - value) <= config.botSettings.maxBoundOnGasLost))) {
            console.log('executing without flashbots')
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
          } else {
            console.log('executing with flashbots')
    
            if (config.botSettings.turnOnExecution) {
              
              const preparedTx = await takerBot.populateTransaction.runSweep(
                groupedPreparedData.makersForSC,
                groupedPreparedData.tokenAddressesForSC,
                groupedPreparedData.packet,
                groupedPreparedData.uniqueTokenAddresses,
                groupedPreparedData.swapData,
                {
                  value
                }
              )
                
              console.log('preparedTx: ', JSON.stringify(preparedTx, null, 2))

              flashbotsTxs.push({
                signer: wallet,
                transaction: {
                  ...preparedTx,
                  gasPrice: PRIORITYFEE + maxBaseFeeInFutureBlock.toBigInt(),
                  gasLimit: gasEstimate.toBigInt(),
                  chainId: 1,
                }
              })
            }
            succesfulCount++
          }
        } catch (e) {
          console.error(e.message)
        }
      }

    console.log('current succesfulCount: ', succesfulCount)
    if (flashbotsTxs.length > 0) {
      console.log('signing Flashbots bundle')
      const signedTransactions = await flashbotsProvider.signBundle(flashbotsTxs)
      const targetBlockNumber = (await provider.getBlockNumber()) + futureBlocksCount
      
      console.log('simulating bundle')
      const simulation = await flashbotsProvider.simulate(signedTransactions, targetBlockNumber)
      console.log(JSON.stringify(simulation, null, 2))
      
      console.log('sending bundle')
      const flashbotsTransactionResponse = await flashbotsProvider.sendRawBundle(
        signedTransactions,
        targetBlockNumber,
      ) as any as FlashbotsTransactionResponse

      console.log(
        await flashbotsProvider.getBundleStatsV2(
          flashbotsTransactionResponse.bundleHash,
          targetBlockNumber,
        ),
      );

      await flashbotsTransactionResponse.wait()
      console.log(flashbotsTransactionResponse)
    }
    } catch (e) {
      console.error(e.message)
    }
  }

  console.log('succesfulCount: ', succesfulCount)
  return currentTokenChunk
}
