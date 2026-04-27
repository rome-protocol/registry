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

/**
 * How the chain prices gas. `type: default` means no external pool — Rome uses its built-in pricing. Any pool-based type requires `poolAddress` (Solana base58) and the pool's pair must contain the chain's gas mint on one side and a pricing reference (SOL, USDC, or similar) on the other.
 */
export type PerChainGasPricingSource = {
  [k: string]: unknown | undefined;
} & {
  /**
   * default = no external pool; otherwise names the AMM protocol whose pool is read.
   */
  type:
    | "default"
    | "meteora_damm_v1_pool"
    | "meteora_damm_v2_pool"
    | "raydium_amm_v4"
    | "raydium_clmm"
    | "raydium_cpmm"
    | "orca_whirlpool"
    | "orca_amm_v2"
    | "phoenix";
  /**
   * Solana base58 address of the pool. Required when type != 'default'.
   */
  poolAddress?: string;
  pair?: {
    /**
     * Mint id (base58) of the chain's gas mint side.
     */
    base?: string;
    /**
     * Mint id (base58) of the pricing-reference side (typically USDC, SOL).
     */
    quote?: string;
  };
  notes?: string;
};

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
 * All three kinds present an EVM ERC-20 surface (transfer, balanceOf, approve). The kind enum captures what is BEHIND that surface — where the value actually lives.
 *   - gas: An SPL token deposited into a Rome-EVM-owned gas pool. The pool is a Solana account owned by the Rome EVM program, chain-wide (single pool, not per-user). Users acquire a balance by depositing SPL into the pool; the per-user share is ledgered on the EVM side as an ERC-20-like balance. The underlying SPL never leaves the pool. This is what the chain uses as its gas-accounting unit. Requires mintId AND gasPool. NOT a native EVM ERC-20.
 *   - spl_wrapper: A user-bringable SPL token. The underlying SPL stays in the user's own PDA (per-user, not pooled). The EVM-side SPL_ERC20 wrapper is a facade that performs SPL Token CPIs against the user's PDA. Requires mintId.
 *   - erc20: A native EVM-deployed ERC-20 contract. No Solana side at all — no mintId, no gasPool, no PDA backing. e.g. a project's governance token deployed by a developer via standard Solidity. Cannot be the chain's gas token (gas requires Solana SPL backing in a Rome-EVM-owned pool).
 */
export type PerChainCanonicalTokenList = {
  [k: string]: unknown | undefined;
}[];
