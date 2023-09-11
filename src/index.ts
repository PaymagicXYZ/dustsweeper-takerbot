// const { ethers } = require("ethers");
import { ethers, Event } from 'ethers'
import axios from 'axios'
import dotenv from 'dotenv'
// MUST BE HERE: To initialize .env variables first
dotenv.config()

import DustSweeper from './abis/DustSweeper.json'
import ERC20 from './abis/ERC20.json'
import config from './config'

/////////////////////////
// EDIT THESE VALUES   //
/////////////////////////
// const makers = [
//     "0xFA62E6eFEc39b4Dc5E3f37D676F18B560f7dD458"
// ];
// const tokenAddresses = [
//     "0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F"
// ];


const providerUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`; // Replace with your provider info
const privateKey = process.env.PK;// Replace with your private key
/////////////////////////
// END EDIT VALUES     //
/////////////////////////

const priceApiUrl = config.priceApiUrl
const dustSweeperAddress = config.dustSweeperAddress

const execute = async (tokenAddressesWithMakers: {tokenAddress: string, makers: string[]}[]) => {
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
  
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey as string, provider);
  const dustSweeperContract = new ethers.Contract(dustSweeperAddress, DustSweeper.abi, wallet);

  // Calculate ETH send amount
  const protocolPercent = await dustSweeperContract.protocolFee();
  const powPercent = ethers.BigNumber.from("10").pow(4);
  
  
  for (const tokenAddressWithMakers of tokenAddressesWithMakers) {
      let totalEthSend = ethers.BigNumber.from(0);
      const tokenAddressesForSC: string[] = []
      const makersForSC: string[] = []

      const tokenAddress = tokenAddressWithMakers.tokenAddress
      const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi, provider);
      const decimals = await tokenContract.decimals();
      const powDecimals = ethers.BigNumber.from("10").pow(decimals);
      const quotePrice = ethers.BigNumber.from(prices.pricesWei[prices.tokenArray.indexOf(tokenAddress)]);
      const takerDiscountTier = await dustSweeperContract.getTokenTakerDiscountTier(tokenAddress);
      const takerPercent = await dustSweeperContract.takerDiscountTiers(takerDiscountTier);

      for (const maker of tokenAddressWithMakers.makers) {
        const allowance = await tokenContract.allowance(maker, dustSweeperContract.address);
        const balance = await tokenContract.balanceOf(maker);
        const amount = balance < allowance ? balance : allowance;
        const totalPrice = quotePrice.mul(ethers.BigNumber.from(amount)).div(powDecimals);
        const discountedPrice = totalPrice.mul(powPercent.sub(takerPercent)).div(powPercent);
        const protocolTotal = totalPrice.mul(protocolPercent).div(powPercent);
        totalEthSend = totalEthSend.add(discountedPrice).add(protocolTotal);
        if (totalEthSend > ethers.BigNumber.from(0)) {
          tokenAddressesForSC.push(tokenAddress)
          makersForSC.push(maker)
        }
      }

      console.log(`makersForSC: ${JSON.stringify(makersForSC)}`)
      console.log(`tokenAddressesForSC: ${JSON.stringify(tokenAddressesForSC)}`)
      console.log(`packet: ${JSON.stringify(packet)}`)
      console.log(`totalEthSend: ${ethers.utils.formatEther(totalEthSend)}`)
      console.log(`totalEthSend: ${totalEthSend}`)
      
      if (totalEthSend > ethers.BigNumber.from(0)) {
        console.log(`totalEthSend is greater than 0, sweeping dust for token ${tokenAddress}`)
        const gas = await dustSweeperContract.estimateGas.sweepDust(
          makersForSC,
          tokenAddressesForSC,
          packet,
          {
              value: totalEthSend
          }
        );
      
        console.log(`gas: ${gas}`)
      
        // const sweepTx = await dustSweeperContract.sweepDust(
        //     makersForSC,
        //     tokenAddressesForSC,
        //     packet,
        //     {
        //         value: totalEthSend
        //     }
        // );
      
        // // console.log("dustSweep txHash: " + sweepTx.hash);
        // const sweepReceipt = await sweepTx.wait();
      
        // console.log("dustSweep txHash: " + sweepReceipt.transactionHash);
      } else {
        console.log(`totalEthSend is 0, no sweeps today for token ${tokenAddress}`)
      }

  }

  console.log("Done")
}

// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error);
//         process.exit(1);
//     });

const monitorAvailableOrders = async () => {
  // get all of the erc20 tokens from coingecko
  const tokens = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=true')
  const allEthTokenAddresses = tokens.data.map((token: any) => (token.platforms && token.platforms.ethereum) ? token.platforms.ethereum : null).filter((token: any) => token !== null)
  console.log(allEthTokenAddresses.length)

  const provider = new ethers.providers.JsonRpcProvider(providerUrl);

  const possibleOrders: {tokenAddress: string, events: Event[]}[] = []

  for (const tokenAddress of allEthTokenAddresses) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi, provider)
    const eventFilter = tokenContract.filters.Approval(null, config.dustSweeperAddress)
    // get the last succesful block after which we will start listening for events
    // for now its 0
    // month in blocks = 224688
    // 17613719 block was on Jul-03-2023
    const events = await tokenContract.queryFilter(eventFilter, 0, 'latest')
    console.log(`events.length: ${events.length}, index: ${allEthTokenAddresses.indexOf(tokenAddress)}`)
    if (events.length > 0) {
      possibleOrders.push({
        tokenAddress,
        events
      })
    }
    
    // for testing purposes
    /////////////////////////
    if (allEthTokenAddresses.indexOf(tokenAddress) >= 100) {
    // if (possibleOrders.length >= 100) {
      break
    }
    /////////////////////////
  }

  console.log(`possibleOrders.length: ${possibleOrders.length}`)

  const tokenAddressesWithMakers = possibleOrders.map((order) => ({tokenAddress: order.tokenAddress, makers: order.events.map((event) => (event.args![0]))}))

  await execute(tokenAddressesWithMakers)

}

monitorAvailableOrders()
