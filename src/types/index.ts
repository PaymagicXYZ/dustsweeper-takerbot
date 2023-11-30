export type PreparedCallDataT = {
  makersForSC: string[],
  tokenAddressesForSC: string[],
  packet: any,
  value: string,
  swapData: string,
  estimatedSwapReturn: string
}

export type GroupedCallDataT = {
  makersForSC: string[],
  tokenAddressesForSC: string[],
  packet: any,
  value: string,
  swapData: string[],
  estimatedSwapReturn: string,
  uniqueTokenAddresses: string[]
}

export type TokenAddressWithMakersT = {
  token: {
    address: string,
    symbol: string,
  },
  makers: any[]
}
