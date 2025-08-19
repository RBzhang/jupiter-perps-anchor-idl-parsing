import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { IDL, type Perpetuals } from "./idl/jupiter-perpetuals-idl";
import { IDL as DovesIDL, type Doves } from "./idl/doves-idl";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// export const RPC_CONNECTION = new Connection(
//   process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
// );
export const RPC_CONNECTION = new Connection(
  process.env.RPC_URL || "https://mainnet.helius-rpc.com/?api-key=e4161acb-2867-46fa-b757-3416e8ed3114",
  // process.env.RPC_URL || "https://rpc.ankr.com/solana",
);

export const DOVES_PROGRAM_ID = new PublicKey(
  "DoVEsk76QybCEHQGzkvYPWLQu9gzNoZZZt3TPiL597e",
  // "39cWjvHrpHNz2SbXv6ME4NPhqBDBd4KsjUYv5JkHEAJU"
);

export const JUPITER_PERPETUALS_PROGRAM_ID = new PublicKey(
  "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu",
);

export const JUPITER_PERPETUALS_EVENT_AUTHORITY_PUBKEY = new PublicKey(
  "37hJBDnntwqhGbK7L6M1bLyvccj4u55CCUiLPdYkiqBN",
);

export const JLP_POOL_ACCOUNT_PUBKEY = new PublicKey(
  "5BUwFW4nRbftYTDMbgxykoFWqWHPzahFSNAaaaJtVKsq",
);

export const JLP_MINT_PUBKEY = new PublicKey(
  "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
);

export const DOVES_PROGRAM = new Program<Doves>(
  DovesIDL,
  DOVES_PROGRAM_ID,
  new AnchorProvider(
    RPC_CONNECTION,
    new Wallet(Keypair.generate()),
    AnchorProvider.defaultOptions(),
  ),
);

export const JUPITER_PERPETUALS_PROGRAM = new Program<Perpetuals>(
  IDL,
  JUPITER_PERPETUALS_PROGRAM_ID,
  new AnchorProvider(
    RPC_CONNECTION,
    new Wallet(Keypair.generate()),
    AnchorProvider.defaultOptions(),
  ),
);

export enum CUSTODY_PUBKEY {
  SOL = "7xS2gz2bTp3fwCC7knJvUWTEU9Tycczu6VhJYKgi1wdz",
  ETH = "AQCGyheWPLeo6Qp9WpYS9m3Qj479t7R636N9ey1rEjEn",
  BTC = "5Pv3gM9JrFFH883SWAhvJC9RPYmo8UNxuFtv5bMMALkm",
  USDC = "G18jKKXQwBbrHeiK3C9MRXhkHsLHf7XgCSisykV46EZa",
  USDT = "4vkNeXiYEUizLdrpdPS1eC2mccyM4NUPRtERrk6ZETkk",
}

// export const CUSTODY_PUBKEYS = [
//   new PublicKey(CUSTODY_PUBKEY.SOL),
//   new PublicKey(CUSTODY_PUBKEY.BTC),
//   new PublicKey(CUSTODY_PUBKEY.ETH),
//   new PublicKey(CUSTODY_PUBKEY.USDC),
//   new PublicKey(CUSTODY_PUBKEY.USDT),
// ];

export const USDC_DECIMALS = 6;
export const BPS_POWER = new BN(10_000);
export const DBPS_POWER = new BN(100_000);
export const RATE_POWER = new BN(1_000_000_000);
export const DEBT_POWER = RATE_POWER;
export const BORROW_SIZE_PRECISION = new BN(1000);
export const JLP_DECIMALS = 6;



// export const PROGRAM_ID = new PublicKey("DPhPs3RZlbCySeRPaZb5GLkW3hczZyJ5MPTXKuYfTq2z"); // Verify on https://station.jup.ag/guides/perpetual-exchange/onchain-accounts

// export const POOL_PUBKEY = new PublicKey("JLPyS4Q6GpYwL2GkmwN7oEejP9m2affSsbK1syeUWyVt"); // Verify on https://station.jup.ag/guides/jlp

export const CUSTODY_PUBKEYS = {
  SOL: new PublicKey("7xS2gz2bTp3fwCC7knJvUWTEU9Tycczu6VhJYKgi1wdz"),
  ETH: new PublicKey("AQCGyheWPLeo6Qp9WpYS9m3Qj479t7R636N9ey1rEjEn"),
  BTC: new PublicKey("5Pv3gM9JrFFH883SWAhvJC9RPYmo8UNxuFtv5bMMALkm"),
  USDC: new PublicKey("G18jKKXQwBbrHeiK3C9MRXhkHsLHf7XgCSisykV46EZa"),
  USDT: new PublicKey("4vkNeXiYEUizLdrpdPS1eC2mccyM4NUPRtERrk6ZETkk"),
};

export const ORACLE_PUBKEYS = {
  SOL: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"),
  ETH: new PublicKey("JBu1AL4obBcCMqK2SXgbVp7rdt534caRMRRB8rfNFUvs"),
  BTC: new PublicKey("GVXRSBjFk6e6J3NbVPXohDJWFv9KKRYmnTkaJmu9D6wq"),
  USDC: new PublicKey("Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD"),
  USDT: new PublicKey("3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL"),
};

