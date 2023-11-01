import config from '../config'

const eth_1inch_address = config.oneinch.eth_1inch_address
const apiBaseUrl = config.oneinch.apiBaseUrl
const headers = { headers: { Authorization: `Bearer ${config.oneinch.api_key}`, accept: "application/json" } };


const apiRequestUrl = (methodName: string, queryParams: { [key: string]: any}) => {
  return apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString();
}

const buildTxForSwap = async (swapParams: { [key: string]: any}) => {
    
  const url = apiRequestUrl("/swap", swapParams)
  // Fetch the swap transaction details from the API
  try {
    const res = await fetch(url, headers)
    
    // delay for 1 second to avoid rate limit
    await new Promise(r => setTimeout(r, 1000))
    
    const data = await res.json();
    if (res.status !== 200) {
      console.log("res.status: ", res.status)
      console.log("description: ", data.description)
      return null
    }
    return data.tx
  } catch (e) {
    console.error(e)
    return null
  }
}

export const prepareSwapData = async (tokenAddress: string, totalTokenAmount: string, botContractAddress: string, senderAddress: string) => {
  // prepare 1inch calldata and check if it is profitable
  const swapParams = {
    src: tokenAddress,
    dst: eth_1inch_address,
    amount: totalTokenAmount.toString(),
    from: botContractAddress,
    slippage: 5, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
    disableEstimate: true, // Set to true to disable estimation of swap details
    receiver: senderAddress
  }

  const swapTransaction = await buildTxForSwap(swapParams);
  if (swapTransaction) {
    const quotePrice = await fetch(apiRequestUrl("/quote", {
      src: swapParams.src,
      dst: swapParams.dst,
      amount: swapParams.amount
    }), headers)
    const quotePriceData = await quotePrice.json();
    await new Promise(r => setTimeout(r, 1000))
    return {
      swapData: swapTransaction.data as string,
      estimatedSwapReturn: quotePriceData.toAmount
    }
  }
  return null
}