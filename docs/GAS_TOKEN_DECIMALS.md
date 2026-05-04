# Gas-token decimals selection

This document explains how decimals are chosen for the gas token of a Rome chain, and why. Read this before bringing up a new chain.

The gas token of a Rome chain is an SPL token (or, in rare cases, native SOL). Its decimals affect how EVM-side gas balances scale into Solana-side base units, what the smallest wrap/unwrap unit looks like, and which tokens are even eligible.

## TL;DR

- **EVM-side gas decimals are always 18.** Hardcoded in `rome-evm-private` to keep MetaMask, ethers, viem, hardhat, and other stock EVM tooling drop-in compatible. Not a chain-time choice.
- **SPL mint decimals are per-chain.** Set once at chain registration time; immutable after.
- **Conversion is mechanical:** `1 EVM gas wei = 10^(18 − mint_decimals) SPL base units`.
- **Constraint:** `0 ≤ mint_decimals ≤ 18`. Wrap/unwrap amounts must divide cleanly by `10^(18 − mint_decimals)`.
- **Pick by token symbol:** USDC/USDT → 6; WSOL → 9; WETH → 18; custom SPL → read on-chain or pick at mint time.

## The two-layer model

A Rome chain has two distinct gas-decimals values, and confusing them is the most common bring-up mistake.

| Layer | Value | Where it lives | Per-chain? |
|---|---|---|---|
| EVM-side gas (wei) | **18** (always) | `rome-evm-private/program/src/config.rs:24` (`RSOL_DECIMALS`) | No — same on every Rome chain |
| SPL mint decimals | 0..=18 (per-chain) | The on-chain `Mint` account; recorded in `tokens.json` `kind: gas` entry | Yes — chosen at `reg-rollup` time, immutable after |

The **EVM side is frozen at 18** because every standard wallet and library assumes that — `parseEther`, `formatEther`, MetaMask balance display, RPC `eth_getBalance`. Changing it would force every Rome user to learn a chain-specific wei width, which is exactly the kind of "Rome-specific quirk for an in-scope use case" the design principle in `/Users/anilkumar/rome/CLAUDE.md` rules out.

The **SPL side is per-chain** because the underlying token's decimals are determined by the mint, and Rome supports many possible gas tokens.

## The conversion formula

When a user wraps EVM gas balance to its SPL representation (or vice versa), the protocol scales by the decimals difference:

```
spl_units = wei / 10^(18 - mint_decimals)
wei       = spl_units * 10^(18 - mint_decimals)
```

Implemented at [`rome-evm-private/program/src/state/aux.rs:70`](https://github.com/rome-protocol/rome-evm-private/blob/master/program/src/state/aux.rs) (`rsol_to_u64`):

```rust
pub fn rsol_to_u64(rsol: U256, decimals: u8) -> Result<u64> {
    assert!(RSOL_DECIMALS >= decimals);
    let pow = (RSOL_DECIMALS - decimals) as usize;
    let (int_amount, remainder) = rsol.div_mod(U256::exp10(pow));
    if !remainder.is_zero() {
        return Err(TxValueNotMultipleOf(format!("10^{}", pow)))
    }
    if int_amount > U256::from(u64::MAX) {
        return Err(TxValueExceedsU64)
    }
    Ok(int_amount.as_u64())
}
```

Two reverts the user sees in practice:

- **`TxValueNotMultipleOf(10^N)`** — the wrap/unwrap amount in wei doesn't divide cleanly. With 6-decimal gas (USDC), every wrap amount must be a multiple of 10¹² wei (= 1 µUSDC). Sending 1 µUSDC + 1 wei reverts.
- **`TxValueExceedsU64`** — the resulting SPL base-unit count would overflow u64. Mostly theoretical for sane amounts.

## Common gas tokens

These are the canonical decimals for the common cases. `/bring-up-chain --gas-token-symbol <SYM>` looks up this table.

| Symbol | Decimals | Wrap dust (in wei) | What 1 unit looks like | Notes |
|---|---:|---|---|---|
| **USDC** | 6 | 10¹² | 0.000001 USDC = 1 µUSDC | Solana stablecoin convention. Used by every Rome chain to date. |
| **USDT** | 6 | 10¹² | 0.000001 USDT | Solana stablecoin convention |
| **FDUSD** | 6 | 10¹² | 0.000001 FDUSD | Solana stablecoin convention |
| **WSOL** | 9 | 10⁹ | 0.000000001 SOL = 1 lamport | Wrapped SOL — the standard SPL representation of native SOL |
| **WETH** | 18 | 1 | 1 wei | Wrapped ETH on Solana. 1:1 with EVM wei — no scaling at all. |
| native SOL | n/a | n/a | n/a | No `chain_mint_id` at all. **Different bring-up path** — `settle_inbound_bridge` does not fire; inbound CCTP/Wormhole behaves differently. See `/bring-up-chain SKILL.md` §"SOL-gas vs SPL-gas chains". |
| **custom SPL** | read on-chain or pick at mint time | 10^(18−N) | depends on N | Constraint: `0 ≤ N ≤ 18` |

### Why these specific values?

- **6 decimals** — Solana's stablecoin convention. USDC, USDT, FDUSD all mint at 6 decimals on Solana. Ethereum mainnet USDC is also 6, so cross-chain bookkeeping is clean.
- **9 decimals** — Solana's native SOL precision (1 SOL = 10⁹ lamports). WSOL inherits this.
- **18 decimals** — Ethereum's wei convention. WETH on Solana mints at 18 to match. With 18-decimal gas the EVM side and SPL side share base units, no scaling needed.
- **Other values** are valid but rare. A token with 12 decimals would scale by 10⁶; with 4 decimals by 10¹⁴. The protocol doesn't care, as long as `0 ≤ N ≤ 18`.

## Constraints (enforced)

These are checked on-chain and in the registry CI. Failure modes:

| Constraint | Where checked | Failure |
|---|---|---|
| `decimals` field is integer in `[0, 18]` | `registry/schema/tokens.schema.json:21` | Schema validation rejects the PR |
| Mint's on-chain `decimals ≤ 18` | `rome-evm-private/program/src/api/reg_owner.rs:85` (`check_decimals`) | `reg-rollup` returns `TooHighSplDecimals(decimals, mint)` |
| Wrap/unwrap amount is multiple of `10^(18−decimals)` | `rome-evm-private/program/src/state/aux.rs:76` | EVM tx reverts with `TxValueNotMultipleOf(10^N)` |
| Registered `decimals` matches on-chain mint | registry CI liveness probe (`tools/liveness.ts`) | PR rejected with explicit field/expected/actual |

## Choosing decimals at chain bring-up

Two paths via `/prepare-rollup`:

### Path A — fresh mint (default for `/bring-up-chain`)

`/prepare-rollup` Phase 1 mints a new SPL token with `spl-token create-token --decimals N`. The operator chooses `N`. The token is whatever you say it is — no prior on-chain identity to inherit from.

In this path, you pick decimals based on what you want the gas-token to *resemble* — pick 6 for "USDC-grade gas," 9 for "SOL-grade," 18 for "EVM wei parity," etc.

For USDC-gas chains the value to pass is **6** — USDC-grade precision is the cleanest fit for typical user-facing balances and exchange flows, and matches USDC's on-chain decimals on Solana so the wrap/unwrap conversion is direct.

### Path B — existing mint (`/prepare-rollup --mint <pubkey>`)

If the operator passes `--mint <pubkey>`, `/prepare-rollup` skips the mint and uses the existing one. **Decimals are then read from the on-chain mint account**; `--mint-decimals` is ignored (per `/prepare-rollup SKILL.md:12`).

This path is for chains that want to use a pre-existing SPL token (e.g. devnet USDC) directly as gas. The decimals choice is no longer a choice — it's whatever the mint says.

## What `/bring-up-chain` does for you

The skill exposes two args:

- `--gas-token-symbol <SYM>` (default `USDC`) — looks up the canonical decimals from the table above
- `--mint-decimals <N>` — manual override; always wins

Behavior:

| Operator input | Result |
|---|---|
| no flags | symbol=`USDC`, decimals=6 (default; matches every Rome chain to date) |
| `--gas-token-symbol WSOL` | decimals=9 (looked up) |
| `--gas-token-symbol WETH` | decimals=18 (looked up) |
| `--gas-token-symbol PEPE` | halt — symbol not in canonical table; pass `--mint-decimals N` |
| `--mint-decimals 8` | decimals=8 (override; symbol stays as default `USDC` for naming) |
| `--gas-token-symbol PEPE --mint-decimals 18` | decimals=18 (override wins; symbol=PEPE) |

Phase 0 prints the choice + rationale before any work happens. Operator confirms or aborts.

## File references

| What | Where |
|---|---|
| `RSOL_DECIMALS = 18` constant | `rome-evm-private/program/src/config.rs:24` |
| Conversion (`rsol_to_u64`) | `rome-evm-private/program/src/state/aux.rs:70` |
| Decimals validation at registration | `rome-evm-private/program/src/api/reg_owner.rs:85` (`check_decimals`) |
| Wrap-gas precompile (`0x42…0018`) | `rome-evm-private/program/src/non_evm/wrap_gas_to_spl.rs` |
| Unwrap-gas precompile (`0x42…0017`) | `rome-evm-private/program/src/non_evm/unwrap_spl_to_gas.rs` |
| Schema constraint | `registry/schema/tokens.schema.json:21` |
| Token-kind verification | [`docs/VERIFICATION_RULES.md`](./VERIFICATION_RULES.md) §"kind: gas" |
| `/bring-up-chain` mechanical lookup | `~/rome/.claude/skills/bring-up-chain/SKILL.md` Phase 0 §"Gas-token decimals" |
| `/prepare-rollup` `--mint-decimals` flag | `~/rome/.claude/skills/prepare-rollup/SKILL.md` |
