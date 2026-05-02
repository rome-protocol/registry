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

/**
 * Bridge configuration for a Rome chain — source-EVM contracts, Solana mints, and the off-chain CCTP attestation API the bridge worker polls for this chain's CCTP routes.
 */
export interface PerChainBridgeWiring {
  sourceEvm: {
    chainId: number;
    name: string;
    rpcUrl?: string;
    usdc: string;
    cctpTokenMessenger?: string;
    cctpMessageTransmitter?: string;
    wormholeTokenBridge?: string;
  };
  cctpIrisApiBase?: string;
  solana: {
    [k: string]: unknown | undefined;
  };
}

export interface RomeChainCoreIdentity {
  chainId: number;
  name: string;
  network: "mainnet" | "testnet" | "devnet" | "local";
  rpcUrl: string;
  explorerUrl?: string;
  /**
   * Rome EVM program ID (Solana base58) this chain is registered under. Most chains share `DP1dshBzmXXVsRxH5kCKMemrDuptg1JvJ1j5AsFV4Hm3`; chains running a custom rome-evm fork (e.g. meta-hook test branches) declare their own. Optional; consumers fall back to the canonical shared program when absent. Added v0.4.0 — supersedes `solanaProgramId`.
   */
  romeEvmProgramId?: string;
  /**
   * DEPRECATED v0.4.0 — use `romeEvmProgramId`. Same semantics: the Rome EVM program ID this chain is registered under. Retained as an optional alias for one minor cycle so external consumers can migrate; will be removed in v1.0.0. Consumers should prefer `romeEvmProgramId` when both are present.
   */
  solanaProgramId?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  status: "live" | "preparing" | "retired";
  /**
   * Per-chain Solana settlement target + compatibility tracking. Added v0.3.0.
   */
  solana?: {
    /**
     * Which Solana cluster this Rome chain settles to. Rome only targets mainnet and devnet — never Solana testnet (Rome's testnet rollups use Solana devnet).
     */
    cluster: "mainnet" | "devnet";
    /**
     * Last Solana version this chain's stack (proxy + hercules + rhea) was verified compatible with.
     */
    tested?: {
      version: string;
      verifiedAt: string;
      notes?: string;
    };
    /**
     * Optional. Rome's own Solana RPC URL this chain's services connect to. Operator-private — partner-self-hosted chains may omit.
     */
    romeRpcUrl?: string;
    /**
     * Optional. Solana version Rome runs on its node for this chain. Cross-reference with solana/clusters.json#romeNodeVersion.
     */
    romeNodeVersion?: string;
  };
}

/**
 * Tracks the upstream Solana versions on the two clusters Rome cares about (mainnet, devnet). Rome explicitly does NOT target Solana testnet — Rome's testnet rollups settle to Solana devnet. Live data lives at solana/clusters.json. Updated whenever Solana ships a new release on either cluster, ideally before Rome's own RPC nodes upgrade so we have a tested-compatible reference point.
 */
export interface SolanaClusterRegistryVersionsRomeTargets {
  clusters: {
    mainnet: Cluster;
    devnet: Cluster;
  };
}
export interface Cluster {
  /**
   * Upstream solana-core version reported by getVersion (e.g. 3.1.13, 4.0.0-beta.6).
   */
  solanaVersion: string;
  /**
   * Public RPC endpoint used to capture the verifiedAt snapshot.
   */
  rpcUrl: string;
  /**
   * Optional. The numeric feature-set ID returned alongside solanaVersion. Useful for catching feature-gate flips before client behavior changes.
   */
  featureSet?: number;
  /**
   * ISO-8601 date the snapshot was taken (YYYY-MM-DD).
   */
  verifiedAt: string;
  /**
   * Optional. Solana version Rome runs on its own RPC nodes for this cluster. Track upstream + Rome side-by-side to catch drift before a coordinated upgrade — Rome ahead of upstream is fine on devnet (testing the next mainnet release); on mainnet it should match upstream once verified.
   */
  romeNodeVersion?: string;
  /**
   * Free-form context — coordinated rollout windows, known compatibility quirks, blockers.
   */
  notes?: string;
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
      /**
       * SHA-256 of the deployed runtime bytecode (lowercase hex, 64 chars). Lets consumers verify the on-chain code matches what was reviewed off-chain. Optional; emitted by `contract-deploys` workflows. Added v0.4.0.
       */
      bytecodeSha256?: string;
      /**
       * Full Git SHA-1 (lowercase hex, 40 chars; never short) of the source repo commit this artifact was compiled from. Combined with `bytecodeSha256` and `compilerVersion`, gives a deterministic provenance triple. Optional. Added v0.4.0.
       */
      sourceGitSha?: string;
      /**
       * Solidity compiler version that produced the bytecode (e.g. `0.8.28` or `0.8.28+commit.7893614a`). Pairs with `sourceGitSha` for reproducible builds. Optional. Added v0.4.0.
       */
      compilerVersion?: string;
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
      /**
       * SHA-256 of the deployed runtime bytecode (lowercase hex, 64 chars). Lets consumers verify the on-chain code matches what was reviewed off-chain. Optional; emitted by `contract-deploys` workflows. Added v0.4.0.
       */
      bytecodeSha256?: string;
      /**
       * Full Git SHA-1 (lowercase hex, 40 chars; never short) of the source repo commit this artifact was compiled from. Combined with `bytecodeSha256` and `compilerVersion`, gives a deterministic provenance triple. Optional. Added v0.4.0.
       */
      sourceGitSha?: string;
      /**
       * Solidity compiler version that produced the bytecode (e.g. `0.8.28` or `0.8.28+commit.7893614a`). Pairs with `sourceGitSha` for reproducible builds. Optional. Added v0.4.0.
       */
      compilerVersion?: string;
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

/**
 * Canonical SOL liquid-staking-token (LST) mint addresses, keyed by short symbol. LST tokens have 9 decimals across the board (Solana SOL convention). Cardo's stake intent ranks across these — adding a new LST here is the only step needed to surface it in /orchestrator's stake routes.
 */
export interface SolanaLiquidStakingTokenMintsPerNetwork {
  [k: string]:
    | {
        /**
         * SPL mint address (base58).
         */
        mint: string;
        /**
         * Display ticker, e.g. 'JitoSOL'.
         */
        symbol: string;
        /**
         * Human-readable protocol name.
         */
        name: string;
        /**
         * Underlying staking framework. spl-stake-pool covers most; marinade is its own program.
         */
        program: "spl-stake-pool" | "marinade" | "sanctum" | "jpool";
        /**
         * Stake-pool account address. For spl-stake-pool members; absent for marinade.
         */
        stakePool?: string;
        /**
         * Approximate SOL → LST exchange rate at registry update time. Live rate must be read from the pool; this is fallback / sanity-check only.
         */
        expectedRate?: number;
        /**
         * Approximate APY string, e.g. '~7.0%'. Indicative only.
         */
        approxApy?: string;
      }
    | undefined;
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

/**
 * Canonical program IDs for the protocols Rome integrates with on a given Solana cluster. Required entries are core SPL / system programs that exist identically across networks; everything else is optional and only present when (a) Rome's services or Cardo's adapters use it, and (b) it's deployed on that cluster.
 */
export interface SolanaProgramIDsPerNetwork {
  /**
   * SPL Token program (classic Tokenkeg).
   */
  splToken: string;
  /**
   * SPL Token-2022 (extensions: transfer hooks, confidential transfers, etc.).
   */
  splToken2022?: string;
  associatedToken: string;
  systemProgram: string;
  /**
   * SPL Memo program — used by Cardo to tag orchestrator txs.
   */
  memo?: string;
  wormholeCore?: string;
  wormholeTokenBridge?: string;
  cctpMessageTransmitter?: string;
  cctpTokenMessenger?: string;
  /**
   * SPL stake-pool program — covers JitoSOL, bSOL, JupSOL, dSOL, etc. Marinade is separate.
   */
  stakePool?: string;
  /**
   * Marinade Liquid Staking — its own program (NOT spl-stake-pool). mSOL deposit/unstake target.
   */
  marinade?: string;
  /**
   * Raydium hand-rolled AMM v4 — devnet redeploy at HWy1jot…, NOT same as mainnet.
   */
  raydiumAmmV4?: string;
  /**
   * Raydium constant-product MM — Anchor-based; devnet redeploy at CPMDWBwJ….
   */
  raydiumCpmm?: string;
  /**
   * Raydium concentrated-liquidity MM — devnet redeploy at devi51m….
   */
  raydiumClmm?: string;
  /**
   * Meteora Dynamic Liquidity MM (LB-pair / multi-bin).
   */
  meteoraDlmm?: string;
  /**
   * Meteora dynamic AMM v1 — production gas-pricing pool family.
   */
  meteoraDammV1?: string;
  /**
   * Meteora dynamic AMM v2.
   */
  meteoraDammV2?: string;
  orcaWhirlpool?: string;
  /**
   * Phoenix CLOB — order-book DEX.
   */
  phoenix?: string;
  /**
   * Pump.fun bonding-curve token launches.
   */
  pumpFun?: string;
  /**
   * PumpSwap — DEX layer over Pump.fun graduations.
   */
  pumpSwap?: string;
  /**
   * Kamino lending (klend) — Main market USDC reserve. Mainnet only today.
   */
  kaminoLend?: string;
  /**
   * Kamino farms — required for klend deposits with farms enabled.
   */
  kaminoFarms?: string;
  /**
   * Mango v4 — perpetuals + spot + lending.
   */
  mangoV4?: string;
  /**
   * Drift v2 — perpetuals + spot.
   */
  driftV2?: string;
  /**
   * MarginFi v2 — lending.
   */
  marginfiV2?: string;
  /**
   * Streamflow — token vesting + payment streaming.
   */
  streamflow?: string;
  /**
   * Solana Name Service — domain registration.
   */
  sns?: string;
  /**
   * Squads V4 multisig — propose / approve / execute.
   */
  squadsV4?: string;
  /**
   * SPL Governance (Realms) — DAO voting.
   */
  splGovernance?: string;
  /**
   * Jupiter aggregator router (v6) — used by Cardo orchestrator for swap + stake routing.
   */
  jupiterV6?: string;
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
