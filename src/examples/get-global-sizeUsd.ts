import { Connection, PublicKey } from "@solana/web3.js";
import { Program, Idl } from "@coral-xyz/anchor";
import idl from "../idl/jupiter_perpetuals.json";
import { RPC_CONNECTION, PROGRAM_ID, CUSTODY_PUBKEYS } from "../constants";

async function sumLongSizeUsdByToken() {
  try {
    const program = new Program(idl as Idl, PROGRAM_ID, { connection: RPC_CONNECTION });

    // Fetch all Position accounts
    const positionAccounts = await program.account.position.all();

    // Initialize sums for each token
    const sizeUsdSums: { [key: string]: number } = {
      SOL: 0,
      ETH: 0,
      BTC: 0,
    };

    // Iterate through positions and sum sizeUsd for long positions by token
    for (const account of positionAccounts) {
      const position = account.account;
      const custodyPubkey = position.custody.toBase58();

      // Determine token based on custody address
      let token: string | undefined;
      if (custodyPubkey === CUSTODY_PUBKEYS.SOL.toBase58()) {
        token = "SOL";
      } else if (custodyPubkey === CUSTODY_PUBKEYS.ETH.toBase58()) {
        token = "ETH";
      } else if (custodyPubkey === CUSTODY_PUBKEYS.BTC.toBase58()) {
        token = "BTC";
      }

      if (token && position.side === 1) { // Assuming side === 1 for long (verify in IDL: Side { Long = 1 })
        // Convert sizeUsd to USD (assuming 6 decimals for USD values)
        const sizeUsd = position.sizeUsd.toNumber() / Math.pow(10, 6);
        sizeUsdSums[token] += sizeUsd;
      }
    }

    // Print results
    console.log("Total sizeUsd for Long Positions by Position Type:");
    console.log(`SOL: ${sizeUsdSums.SOL.toFixed(2)} USD`);
    console.log(`ETH: ${sizeUsdSums.ETH.toFixed(2)} USD`);
    console.log(`BTC: ${sizeUsdSums.BTC.toFixed(2)} USD`);
    console.log(`Total: ${(sizeUsdSums.SOL + sizeUsdSums.ETH + sizeUsdSums.BTC).toFixed(2)} USD`);
  } catch (error) {
    console.error("Error calculating sum of sizeUsd for long positions by token:", error);
  }
}

sumLongSizeUsdByToken();