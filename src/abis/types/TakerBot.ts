/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "./common";

export type TrustusPacketStruct = {
  v: BigNumberish;
  r: BytesLike;
  s: BytesLike;
  request: BytesLike;
  deadline: BigNumberish;
  payload: BytesLike;
};

export type TrustusPacketStructOutput = [
  v: bigint,
  r: string,
  s: string,
  request: string,
  deadline: bigint,
  payload: string
] & {
  v: bigint;
  r: string;
  s: string;
  request: string;
  deadline: bigint;
  payload: string;
};

export interface TakerBotInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "DUSTSWEEPER_ADDRESS"
      | "ONE_INCH_ROUTER"
      | "acceptOwnershipTransfer"
      | "commitOwnershipTransfer"
      | "futureOwner"
      | "isApproved"
      | "owner"
      | "payoutEth"
      | "runSweep"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "DUSTSWEEPER_ADDRESS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "ONE_INCH_ROUTER",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "acceptOwnershipTransfer",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "commitOwnershipTransfer",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "futureOwner",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "isApproved",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(functionFragment: "payoutEth", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "runSweep",
    values: [
      AddressLike[],
      AddressLike[],
      TrustusPacketStruct,
      AddressLike[],
      BytesLike[]
    ]
  ): string;

  decodeFunctionResult(
    functionFragment: "DUSTSWEEPER_ADDRESS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "ONE_INCH_ROUTER",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "acceptOwnershipTransfer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "commitOwnershipTransfer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "futureOwner",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "isApproved", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "payoutEth", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "runSweep", data: BytesLike): Result;
}

export interface TakerBot extends BaseContract {
  connect(runner?: ContractRunner | null): TakerBot;
  waitForDeployment(): Promise<this>;

  interface: TakerBotInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  DUSTSWEEPER_ADDRESS: TypedContractMethod<[], [string], "view">;

  ONE_INCH_ROUTER: TypedContractMethod<[], [string], "view">;

  acceptOwnershipTransfer: TypedContractMethod<[], [boolean], "nonpayable">;

  commitOwnershipTransfer: TypedContractMethod<
    [_futureOwner: AddressLike],
    [boolean],
    "nonpayable"
  >;

  futureOwner: TypedContractMethod<[], [string], "view">;

  isApproved: TypedContractMethod<
    [arg0: AddressLike, arg1: AddressLike],
    [boolean],
    "view"
  >;

  owner: TypedContractMethod<[], [string], "view">;

  payoutEth: TypedContractMethod<[], [void], "nonpayable">;

  runSweep: TypedContractMethod<
    [
      makers: AddressLike[],
      tokenAddresses: AddressLike[],
      packet: TrustusPacketStruct,
      uniqueTokenAddresses: AddressLike[],
      oneinchCallDataByToken: BytesLike[]
    ],
    [void],
    "payable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "DUSTSWEEPER_ADDRESS"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "ONE_INCH_ROUTER"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "acceptOwnershipTransfer"
  ): TypedContractMethod<[], [boolean], "nonpayable">;
  getFunction(
    nameOrSignature: "commitOwnershipTransfer"
  ): TypedContractMethod<[_futureOwner: AddressLike], [boolean], "nonpayable">;
  getFunction(
    nameOrSignature: "futureOwner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "isApproved"
  ): TypedContractMethod<
    [arg0: AddressLike, arg1: AddressLike],
    [boolean],
    "view"
  >;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "payoutEth"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "runSweep"
  ): TypedContractMethod<
    [
      makers: AddressLike[],
      tokenAddresses: AddressLike[],
      packet: TrustusPacketStruct,
      uniqueTokenAddresses: AddressLike[],
      oneinchCallDataByToken: BytesLike[]
    ],
    [void],
    "payable"
  >;

  filters: {};
}