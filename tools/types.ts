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
   * Rome EVM program ID (Solana base58) this chain is registered under. Required for new chains: the post-clean-slate registry has no canonical default to fall back on (legacy `FixtureProgramIdFixtureProgramIdFixture12345` closed 2026-05-02). Once the next primary rome-evm program is deployed (Phase 5), `programs/index.json#primary[<cluster>]` becomes the authoritative pointer; chains running a custom rome-evm fork (e.g. meta-hook test branches) still declare their own. Schema keeps the field optional for the v0.3.x → v0.4.x compat window (legacy `solanaProgramId` is still read as a deprecated alias). Added v0.4.0 — supersedes `solanaProgramId`.
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
 * First-class record for a deployed Solana program (rome-evm or supporting program) tracked by the Rome registry. Captures identity, current authority, current build provenance, lifecycle role, and the chains hosted by this program. Append-only history lives in the sibling upgrades.json and authority.json files.
 */
export interface RomeOnChainProgramIdentityLifecycleCurrentBuild {
  schemaVersion: "1";
  /**
   * On-chain Solana program ID (base58). Rome convention for new deploys: prefix `RomeP` for mainnet rome-evm programs, `RomeD` for devnet rome-evm programs — produced via `solana-keygen grind --starts-with` in /deploy-program. Convention is enforced at deploy time by skill, not by schema (legacy/imported programs may not match). CI may warn on violations but not block.
   */
  programId: string;
  /**
   * Human-readable label, e.g. 'rome-evm primary devnet'.
   */
  name?: string;
  /**
   * Program family. Most rows are 'rome-evm'.
   */
  kind: "rome-evm" | "meta-hook" | "cardo-orchestrator";
  /**
   * Solana cluster this program is deployed on. Rome only targets mainnet and devnet.
   */
  cluster: "devnet" | "mainnet";
  /**
   * Lifecycle of the on-chain program. live = serving traffic; decommissioning = no new chains, existing chains migrating off; retired = no chains hosted, binary still on chain; closed = `solana program close` ran, rent reclaimed, programId permanently unusable. **Mainnet immutability rule**: transitions AWAY from `live` on mainnet programs require human-tagged commits; no automation may flip mainnet status.
   */
  status: "live" | "decommissioning" | "retired" | "closed";
  /**
   * Role in the cluster's program portfolio. Exactly one program may hold role=primary per cluster (enforced by CI invariant against programs/index.json). secondary = production but not the default for new chains; rehearsal = test/staging program. decommissioning/retired/closed mirror status; redundant-but-explicit so role-based queries don't have to join with status.
   */
  role: "primary" | "secondary" | "rehearsal" | "decommissioning" | "retired" | "closed";
  /**
   * ISO-8601 timestamp when this program was last promoted into its current role. null for programs created at their current role.
   */
  rolePromotedAt?: string | null;
  /**
   * Append-only role-transition log. First entry records initial role at deploy time.
   */
  roleHistory?: {
    role: "primary" | "secondary" | "rehearsal" | "decommissioning" | "retired" | "closed";
    since: string;
    reason?: string;
  }[];
  /**
   * BPF Loader program ID (typically `BPFLoaderUpgradeab1e11111111111111111111111`).
   */
  loader: string;
  /**
   * ProgramData account address — derived PDA holding the program binary. Use with getSignaturesForAddress to enumerate upgrade history on-chain.
   */
  programDataAddress: string;
  /**
   * Who holds upgrade authority RIGHT NOW. Append history to authority.json. Authority key material is NOT stored in the registry — only the pubkey + storage-location metadata.
   */
  currentAuthority: {
    [k: string]: unknown | undefined;
  };
  /**
   * Current build provenance — what code is running on-chain RIGHT NOW. Replaced atomically on each upgrade.
   */
  current: {
    /**
     * Semver tag if tagged; null otherwise.
     */
    version?: string | null;
    /**
     * Full 40-char git SHA at the source repo.
     */
    gitSha: string;
    /**
     * https URL of the source repo.
     */
    gitRepo: string;
    /**
     * Git tag if applicable (e.g. 'v0.4.2').
     */
    gitTag?: string | null;
    /**
     * Cargo features active at build time (e.g. ['testnet', 'custom-heap']).
     */
    buildFeatureFlags?: string[];
    toolchain?: {
      /**
       * Solana CLI version used by `cargo build-sbf` (e.g. '3.0.0').
       */
      solanaVersion?: string;
      /**
       * Platform-tools version (e.g. 'v1.51').
       */
      platformTools?: string;
      /**
       * Rust toolchain version (e.g. '1.79.0').
       */
      rustToolchain?: string;
    };
    /**
     * SHA-256 of the on-chain programData bytes. CI verifies against `solana program show`.
     */
    programDataSha256: string;
    /**
     * Size of the deployed binary in bytes.
     */
    binarySize: number;
    /**
     * UTC time of the deploy tx.
     */
    deployedAt: string;
    deployedAtSlot: number;
    /**
     * Solana tx signature (base58).
     */
    deployedAtTx: string;
    /**
     * Email/handle of the operator who initiated the deploy.
     */
    deployedBy: string;
    /**
     * GitHub Actions run URL for the build, if applicable.
     */
    ciRunUrl?: string | null;
    upgradesRef?: "./upgrades.json";
  };
  /**
   * Slug references (e.g. '<chainId>-<slug>') of chains currently registered on this program. CI invariant: each entry must have chains/<slug>/chain.json#romeEvmProgramId == this programId.
   */
  chainsHosted: string[];
  /**
   * Chains that were once hosted on this program but have since retired.
   */
  chainsDecommissioned?: {
    chain: string;
    decommissionedAt: string;
    reason?: string;
  }[];
  audit?: {
    lastReview?: string | null;
    reviewUrl?: string | null;
  };
  /**
   * Initial deploy timestamp.
   */
  createdAt: string;
  /**
   * Set when chains have all migrated off this program. **Mainnet immutability rule**: setting this on a mainnet program requires a human-tagged commit; no automation may write to it. Devnet writes may be agent-driven.
   */
  decommissionedAt?: string | null;
  /**
   * Set when `solana program close` reclaims rent. Mutually implies role=closed and status=closed. **Mainnet immutability rule**: setting this on a mainnet program requires a human-tagged commit; no automation may write to it. The on-chain `solana program close` itself for mainnet must also be operator-typed, never agent-invoked.
   */
  closedAt?: string | null;
}

/**
 * Per-program append-only log of every upgrade-authority change (BPF Loader SetAuthority ix, or Squads V4 changeConfig). Mirrors the on-chain history for audit. CI invariant: entries[0].kind=='initial-set' and entries are sorted by rotatedAtSlot ascending.
 */
export interface RomeProgramAuthorityLogAppendOnlyRotationHistory {
  schemaVersion: "1";
  programId: string;
  entries: {
    /**
     * initial-set = authority set during program deploy; rotation = SetUpgradeAuthority to a new signing key; freeze = transfer to non-signing key (no upgrades); burn = transfer to System Program (program permanently immutable).
     */
    kind: "initial-set" | "rotation" | "freeze" | "burn";
    /**
     * Previous authority. null on initial-set.
     */
    from?: {
      pubkey: string;
      kind: "cold-ledger" | "hot-keypair" | "gsm-keypair" | "squads-v4-multisig";
    } | null;
    to: {
      pubkey: string;
      kind: "cold-ledger" | "hot-keypair" | "gsm-keypair" | "squads-v4-multisig" | "frozen" | "burned";
    };
    rotatedAt: string;
    rotatedAtSlot: number;
    rotatedAtTx: string;
    /**
     * Operator email/handle who initiated the rotation.
     */
    rotatedBy?: string;
    reason?: string;
  }[];
}

/**
 * Denormalized index over registry/programs/<id>/program.json files. Source of truth still lives in each program.json; this file enables (a) fast lookup of the primary program per cluster, (b) flat inventory of all known programs without filesystem traversal. CI invariant: each entry's role/cluster/chainsHosted must match its program.json.
 */
export interface RomeProgramIndexPrimaryPointerFlatInventory {
  schemaVersion: "1";
  /**
   * ProgramId designated as the cluster's primary (the default program for new chains). null when no primary has been promoted yet. CI invariant: at most one primary per cluster, and primary[cluster] must match the corresponding program.json#role=='primary'.
   */
  primary: {
    devnet: string | null;
    mainnet: string | null;
  };
  /**
   * Flat map of programId → minimal denormalized fields. Keys are base58 program IDs.
   */
  programs: {
    [k: string]:
      | {
          cluster: "devnet" | "mainnet";
          role: "primary" | "secondary" | "rehearsal" | "decommissioning" | "retired" | "closed";
          kind: "rome-evm" | "meta-hook" | "cardo-orchestrator";
          chainsHosted: string[];
        }
      | undefined;
  };
}

/**
 * Per-program append-only log of every deploy event (initial + upgrades). Each entry captures the full provenance needed to reproduce or audit the deployed binary. CI invariant: entries are sorted by deployedAtSlot ascending, and entries[0].kind must be 'initial'.
 */
export interface RomeProgramUpgradeHistoryAppendOnlyDeployLog {
  schemaVersion: "1";
  programId: string;
  entries: UpgradeEntry[];
}
export interface UpgradeEntry {
  /**
   * initial = first deploy of this programId; upgrade = subsequent BPF Loader Upgrade ix; authority-rotation = setUpgradeAuthority ix (no binary change).
   */
  kind: "initial" | "upgrade" | "authority-rotation";
  version?: string | null;
  gitSha: string;
  /**
   * gitSha of the immediately previous build. null on initial deploy.
   */
  previousGitSha?: string | null;
  gitRepo?: string;
  gitTag?: string | null;
  buildFeatureFlags?: string[];
  toolchain?: {
    solanaVersion?: string;
    platformTools?: string;
    rustToolchain?: string;
  };
  programDataSha256: string;
  previousProgramDataSha256?: string | null;
  binarySize: number;
  deployedAt: string;
  deployedAtSlot: number;
  deployedAtTx: string;
  /**
   * Email/handle of operator who initiated the deploy.
   */
  deployedBy?: string;
  /**
   * Authority that signed this upgrade. May differ from program.json#currentAuthority if authority rotated since this entry.
   */
  authority: {
    pubkey: string;
    kind: "cold-ledger" | "hot-keypair" | "gsm-keypair" | "squads-v4-multisig" | "frozen" | "burned";
  };
  /**
   * Identity that paid SOL for this deploy. Often equal to authority but not required to be.
   */
  feePayer: {
    pubkey: string;
    kind: "cold-ledger" | "hot-keypair" | "gsm-keypair" | "squads-v4-multisig";
  };
  /**
   * Brief human-readable description of what changed.
   */
  summary?: string;
  includedPRs?: number[];
  ciRunUrl?: string | null;
  /**
   * Whether CI has verified the on-chain binary matches the recorded programDataSha256.
   */
  verified?: boolean;
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
 * First-class record for shared services in the Rome ecosystem (bridge workers, oracle keepers, frontend apps, block explorers, monitoring, etc.). Services are SHARED resources that bring-up flows REFERENCE (adding to servesPrograms[] / servesChains[]) and that teardown flows preserve (editing references, never destroying the service infrastructure unless explicit /decommission-service is invoked). The kind field is a free-form string (not an enum) so new service types can land without schema bumps; common values are documented in description.
 */
export interface RomeSharedServiceIdentityScopeReferences {
  schemaVersion: "1";
  /**
   * Lowercase-hyphen identifier matching the directory name (services/<name>/).
   */
  name: string;
  /**
   * Service category. Free-form string (not enum) so new types don't require schema bumps. Common values: 'bridge-worker' (rome-ui-worker, CCTP relayer, Wormhole relayer, native-Solana relayer), 'oracle-keeper' (off-chain price pusher to Oracle Gateway adapters), 'frontend-app' (Cardo, rome-ui), 'block-explorer' (rome-via, rome-scout), 'monitoring' (Grafana, exporters), 'alerting' (Slack bot, oncall pager), 'ci-infra' (GHA runners, image registry), 'backup-runner'.
   */
  kind: string;
  /**
   * One-line human-readable description of what this service does.
   */
  purpose?: string;
  /**
   * Which Rome lifecycle the service is bound to.
   * - 'chain': 1:1 with a chain. Created with the chain. Destroyed with the chain. servesChains[] has exactly one entry.
   * - 'program': bound to one or more rome-evm programs. servesPrograms[] tracks references. Created on first program in cluster; reference-counted; not auto-destroyed when servesPrograms[] becomes empty (operator-only via /decommission-service).
   * - 'cluster': bound to a Solana cluster. Created on first program in the cluster; never auto-decommissioned.
   * - 'global': independent of programs/chains/clusters (CI runners, etc.).
   */
  scope: "chain" | "program" | "cluster" | "global";
  deployment: {
    /**
     * Solana cluster this service serves. null for 'global' scope.
     */
    cluster?: "devnet" | "mainnet" | null;
    /**
     * How the service is hosted. 'static-site' for frontend apps deployed to CDN.
     */
    kind: "k8s" | "vm" | "external" | "static-site";
    /**
     * Free-form location string. Examples: 'gke://rome-l2-gke/devnet-rome-ui', 'gcp-vm://rome-developers/europe-north1/devnet-monitoring', 'cf-pages://rome-website', 'github://rome-protocol/rome-runners'.
     */
    location?: string;
    /**
     * Team or operator responsible. Examples: 'rome-ops', 'sanjeev@romeprotocol.com', 'sattvik@romeprotocol.com'.
     */
    owner?: string;
  };
  /**
   * Reverse-index of programs this service has been brought up for. Bring-up flow appends; teardown flow removes. CI invariant: each entry's programId must have a corresponding programs/<id>/program.json record. Empty array allowed (service running but no current programs — e.g., during clean-slate transitions).
   */
  servesPrograms?: {
    programId: string;
    since: string;
    /**
     * When set, this program no longer served (kept in array for audit history; can be archived).
     */
    until?: string | null;
  }[];
  /**
   * Reverse-index of chains this service has been brought up for. Used for scope='chain' and some 'program'-scope services that maintain per-chain config. Same conventions as servesPrograms.
   */
  servesChains?: {
    /**
     * Chain slug (e.g. '<chainId>-<slug>').
     */
    chain: string;
    since: string;
    until?: string | null;
  }[];
  /**
   * Pointers to where this service's configuration source-of-truth lives. Skills doing config edits know where to make changes. Format: '<repo>:<path>'. Examples: 'rome-ops:ansible/inventories/devnet-rome-ui-gcp/group_vars/host_rome_ui.yml', 'rome-ui:deploy/chains.sample.yaml'.
   */
  configRefs?: string[];
  /**
   * Per-secret metadata. Crucial for teardown safety: skills MUST honor preservation='edit-only' (never delete the secret; only mutate its content). preservation='delete-with-service' allows the secret to be cleaned up only when the service itself is decommissioned.
   */
  secretRefs?: {
    name: string;
    /**
     * Optional shape hint: 'json-map', 'opaque-bytes', 'json-array', 'plain-text'.
     */
    shape?: string;
    /**
     * For json-map shapes: what the keys represent. Examples: 'programId', 'chainId', 'protocol'.
     */
    keyedBy?: string;
    /**
     * 'edit-only': the secret persists across the service's entire lifetime; only its content (e.g. JSON entries inside) gets added/removed by bring-up/teardown. NEVER delete this secret while the service is alive. 'delete-with-service': the secret is owned by the service and gets cleaned up when /decommission-service runs.
     */
    preservation: "edit-only" | "delete-with-service";
    /**
     * Free-form location, e.g. 'gcp:projects/rome-developers/secrets/rome-ui-settle-payers'.
     */
    location: string;
  }[];
  lifecycle?: {
    createdAt: string;
    /**
     * Set by /decommission-service. **Mainnet immutability rule**: setting on mainnet services requires human-tagged commits; no automation may write.
     */
    decommissionedAt?: string | null;
  };
  audit?: {
    lastReview?: string | null;
    reviewUrl?: string | null;
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
