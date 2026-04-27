// AUTO-GENERATED from schema/*.schema.json — do not edit by hand.
// Regenerate via `npm run codegen`.

export interface LogicalAssetCatalogEntry {
  symbol: string;
  name: string;
  issuer?: string;
  decimals: number;
  logoURI?: string;
  description?: string;
  homepage?: string;
  tags?: string[];
}

export interface PerChainBridgeWiring {
  sourceEvm: {
    chainId: number;
    name: string;
    usdc: string;
    cctpTokenMessenger?: string;
    cctpMessageTransmitter?: string;
    wormholeTokenBridge?: string;
  };
  solana: {
    usdcMint: string;
    wethMint?: string;
    wormholeChainIdRef?: string;
    cctpDomainRef?: string;
  };
}

export interface RomeChainCoreIdentity {
  chainId: number;
  name: string;
  network: "mainnet" | "testnet" | "devnet" | "local";
  rpcUrl: string;
  explorerUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  status: "live" | "preparing" | "retired";
}

export type PerChainSolidityContractRegistry = {
  name: string;
  /**
   * @minItems 1
   */
  versions: [
    {
      address: string;
      version: string;
      status: "live" | "deprecated" | "retired";
      deployedAt: string;
      deployTx?: string;
      deprecatedAt?: string;
      replacedBy?: string;
      abiPath?: string;
    },
    ...{
      address: string;
      version: string;
      status: "live" | "deprecated" | "retired";
      deployedAt: string;
      deployTx?: string;
      deprecatedAt?: string;
      replacedBy?: string;
      abiPath?: string;
    }[]
  ];
}[];

export interface PerChainOffChainEndpoints {
  cctpIrisApiBase?: string;
  wormholeSpyEndpoint?: string;
  wormholeRpc?: string;
  relayers?: {
    [k: string]: string | undefined;
  };
}

export interface PerChainOperationalLimitsAndKnownIncidents {
  maxComputeUnitsPerTx?: number;
  maxCpiPerAtomicTx?: number;
  recommendedGasBudgets?: {
    [k: string]: number | undefined;
  };
  knownIncidents?: {
    title: string;
    summary: string;
    fixedAt?: string;
    link?: string;
  }[];
}

export interface PerChainOracleGatewayConfig {
  factory: string;
  defaultMaxStaleness?: number;
  feeds: {
    [k: string]:
      | {
          address: string;
          source: "pyth" | "switchboard";
          underlyingAccount?: string;
        }
      | undefined;
  };
}

export interface SolanaProgramIDsPerNetwork {
  splToken: string;
  associatedToken: string;
  systemProgram: string;
  wormholeCore?: string;
  wormholeTokenBridge?: string;
  cctpMessageTransmitter?: string;
  cctpTokenMessenger?: string;
}

export interface CrossChainBridgeProtocolConstants {
  protocol: "cctp" | "wormhole";
  /**
   * Map of source chain identifier (e.g. 'sepolia', 'solana-devnet', 'eth-mainnet') to integer domain or chain id used by this protocol.
   */
  domains: {
    [k: string]: number | undefined;
  };
}

/**
 * Three token kinds, with different ownership semantics:
 *   - gas: an SPL token deposited into a Rome-EVM-owned gas pool. Underlying SPL sits in the pool (chain-wide); user holds an SPL_ERC20 mint on the EVM side. Requires mintId AND gasPool.
 *   - spl_wrapper: user brings an SPL token; underlying SPL stays in the user's PDA (per-user). EVM-side SPL_ERC20 wrapper is a facade. Requires mintId.
 *   - erc20: native EVM ERC-20 deployed on the chain. No SPL side. No mintId, no gasPool.
 */
export type PerChainCanonicalTokenList = {
  [k: string]: unknown | undefined;
}[];
