import { expect } from 'chai'
import { ethers } from 'hardhat'

import { monitorAvailableOrders, prepareExecute } from '../src/index'

describe("TakerBot contract", async function () {
  it("Deploy and execute sweep", async function () {
    const [owner] = await ethers.getSigners();
    const TakerBot = await ethers.getContractFactory("TakerBot");

    const takerBot = await TakerBot.deploy();

    // monitor
    const tokenAddressesWithMakers = await monitorAvailableOrders()
    
    // prepare calldata
    const preparedCallData = await prepareExecute(tokenAddressesWithMakers)

    // execute
    if (preparedCallData.length > 0) {
      const preparedData = preparedCallData[0]
      console.log(`calling contract with data: ${JSON.stringify(preparedData)}`)
      console.log('preparedData')
      const sweepTx = await takerBot.connect(owner).runSweep(
        preparedData.makersForSC,
        preparedData.tokenAddressesForSC,
        preparedData.packet,
        {
          value: BigInt(preparedData.value)
        }
      )

      const sweepReceipt = await sweepTx.wait();
      console.log("dustSweep txHash: " + sweepReceipt.transactionHash);
    }
  });
});
