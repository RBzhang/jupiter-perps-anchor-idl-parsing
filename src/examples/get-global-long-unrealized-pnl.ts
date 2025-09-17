import { BN, IdlAccounts } from "@coral-xyz/anchor";
import { JUPITER_PERPETUALS_PROGRAM, USDC_DECIMALS, CUSTODY_PUBKEY, CUSTODY_PUBKEYS } from "../constants";
import { Perpetuals } from "../idl/jupiter-perpetuals-idl";
import { BNToUSDRepresentation } from "../utils";
import { Custody, OraclePrice } from "../types";
import { PublicKey } from "@solana/web3.js";
import { fetchOraclePrice } from "./get-aum-with-oracle";
import {getAssetAmountUsd} from "./calculate-pool-aum"
import { getCustodyInstance} from "./getCustodyInstance";
import { getPoolAum } from "./get-pool-aum";
import { get } from "http";

function getPnlForSize(
  sizeUsdDelta: BN,
  positionAvgPrice: BN,
  positionSide: "long" | "short",
  tokenPrice: BN,
) {
  if (sizeUsdDelta.eqn(0)) return [false, new BN(0)];

  const hasProfit =
    positionSide === "long"
      ? tokenPrice.gt(positionAvgPrice)
      : positionAvgPrice.gt(tokenPrice);

  const tokenPriceDelta = tokenPrice.sub(positionAvgPrice).abs();

  const pnl = sizeUsdDelta.mul(tokenPriceDelta).div(positionAvgPrice);

  return [hasProfit, pnl];
}

export async function getGlobalLongsizeUsd() {
  const gpaResult =
    await JUPITER_PERPETUALS_PROGRAM.provider.connection.getProgramAccounts(
      JUPITER_PERPETUALS_PROGRAM.programId,
      {
        commitment: "confirmed",
        filters: [
          {
            memcmp:
              JUPITER_PERPETUALS_PROGRAM.coder.accounts.memcmp("position"),
          },
        ],
      },
    );

  const positions = gpaResult.map((item) => {
    return {
      publicKey: item.pubkey,
      account: JUPITER_PERPETUALS_PROGRAM.coder.accounts.decode(
        "position",
        item.account.data,
      ) as IdlAccounts<Perpetuals>["position"],
    };
  });

  // Old positions accounts are not closed, but have `sizeUsd = 0`
  // i.e. open positions have a non-zero `sizeUsd`
  const openPositions = positions.filter(
    // (position) => position.account.sizeUsd.gtn(0) && position.account.side.long,
    (position) => position.account.sizeUsd.gtn(0),
  );
  const sizeUsdlongbyToken: Record<string, BN> = {
    SOL: new BN(0),
    ETH: new BN(0),
    BTC: new BN(0),
  };
    const sizeUsdshortbyToken: Record<string, BN> = {
    SOL: new BN(0),
    ETH: new BN(0),
    BTC: new BN(0),
  };
  const collateralUsdlongbyToken: Record<string, BN> = {
    SOL: new BN(0),
    ETH: new BN(0),
    BTC: new BN(0),
  };
    const collateralUsdshortbyToken: Record<string, BN> = { 
    SOL: new BN(0),
    ETH: new BN(0),
    BTC: new BN(0),
  };
  const globalsize: Record<string, BN> = {
    long: new BN(0),
    short: new BN(0),
  }
  const shortsize: Record<string, OraclePrice> = {
    SOL: new BN(0),
    ETH: new BN(0),
    BTC: new BN(0),
  };
  const OraclePriceNow: Record<string, OraclePrice> = {};
  // console.log("openPositions: ", openPositions.length);
  const globalowned: Record<string, Custody> = {};
  const realsize: Record<string, BN> = {
    SOL: new BN(0),
    ETH: new BN(0),
    BTC: new BN(0),
  };
  // console.log("openPositions: ", openPositions.length);

  // NOTE: We assume the token price is $100 (scaled to 6 decimal places as per the USDC mint) as an example here for simplicity
  const tokenPrice = new BN(100_000_000);

  let totalPnl = new BN(0);
  // const custodyPubkey = new PublicKey(CUSTODY_PUBKEY.SOL);
  // const oraclePrice = await fetchOraclePrice(custodyPubkey);
  // const custody = await getCustodyInstance(custodyPubkey);

  function getsize_real(
    custody: Custody,
    size: BN,
  ) {
    const delta = USDC_DECIMALS - custody.decimals;
    if(delta > 0) {
      return size.div(new BN(10).pow(new BN(delta)));
    }
    else if(delta < 0) {
      return size.mul(new BN(10).pow(new BN(-delta)));
    }
  }

  openPositions.forEach((position) => {
    // const token = position.account.custody.toString();
    // console.log("Position custody: ", token);
    const custodyAddress = position.account.custody.toString();
    // const side_token = position.account.side.long;
    // console.log("side_token: ", side_token);
    let token: string | undefined = undefined;
    if(position.account.side.long) {
    globalsize['long'] = globalsize['long'].add(new BN(1));
    if (custodyAddress === CUSTODY_PUBKEY.SOL) token = "SOL";
    else if (custodyAddress === CUSTODY_PUBKEY.ETH) token = "ETH";
    else if (custodyAddress === CUSTODY_PUBKEY.BTC) token = "BTC";
    if (!token) return; // 跳过非目标币种
   sizeUsdlongbyToken[token] = sizeUsdlongbyToken[token].add(position.account.sizeUsd);
   collateralUsdlongbyToken[token] = collateralUsdlongbyToken[token].add(position.account.collateralUsd);

    } else if(position.account.side.short) {
      globalsize['short'] = globalsize['short'].add(new BN(1));
      if (custodyAddress === CUSTODY_PUBKEY.SOL) token = "SOL";
      else if (custodyAddress === CUSTODY_PUBKEY.ETH) token = "ETH";
      else if (custodyAddress === CUSTODY_PUBKEY.BTC) token = "BTC";  
      if (!token) return; // 跳过非目标币种
      // console.log("Price: ", position.account.price.toString());
      // console.log("amount: ",token, position.account.sizeUsd.div(position.account.price.div(new BN(10).pow(new BN(6)))).toString());
      // console.log("amount: ", BNToUSDRepresentation(position.account.lockedAmount.mul(position.account.price.div(new BN(10).pow(new BN(8)))),0));
      sizeUsdshortbyToken[token] = sizeUsdshortbyToken[token].add(position.account.sizeUsd);
      collateralUsdshortbyToken[token] = collateralUsdshortbyToken[token].add(position.account.collateralUsd);
      shortsize[token] = shortsize[token].add(position.account.sizeUsd.div(position.account.price.div(new BN(10).pow(new BN(USDC_DECIMALS)))));
    }
    // const [hasProfit, pnl] = getPnlForSize(
    //   position.account.sizeUsd,
    //   position.account.price,
    //   position.account.side.long ? "long" : "short",
    //   tokenPrice,
    // );

    // totalPnl = hasProfit ? totalPnl.add(pnl) : totalPnl.sub(pnl);
  });

  // console.log(
  //   // "Global long unrealized PNL ($)",
  //   // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  //   "GLobal long sizeUsd and collateralUsd SOL",
  //   BNToUSDRepresentation(sizeUsdlongbyToken['SOL'], USDC_DECIMALS),
  //   BNToUSDRepresentation(collateralUsdlongbyToken['SOL'], USDC_DECIMALS),
  // );
  // console.log(
  //   // "Global long unrealized PNL ($)",
  //   // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  //   "GLobal long sizeUsd and collateralUsd BTC",
  //   BNToUSDRepresentation(sizeUsdlongbyToken['BTC'], USDC_DECIMALS),
  //   BNToUSDRepresentation(collateralUsdlongbyToken['BTC'], USDC_DECIMALS),
  // );
  // console.log(
  //   // "Global long unrealized PNL ($)",
  //   // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  //   "GLobal long sizeUsd and collateralUsd ETH",
  //   BNToUSDRepresentation(sizeUsdlongbyToken['ETH'], USDC_DECIMALS),
  //   BNToUSDRepresentation(collateralUsdlongbyToken['ETH'], USDC_DECIMALS),
  // );
  //   console.log(
  //   // "Global long unrealized PNL ($)",
  //   // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  //   "GLobal short sizeUsd and collateralUsd SOL",
  //   BNToUSDRepresentation(sizeUsdshortbyToken['SOL'], USDC_DECIMALS),
  //   BNToUSDRepresentation(collateralUsdshortbyToken['SOL'], USDC_DECIMALS),
  // );
  // console.log(
  //   // "Global long unrealized PNL ($)",
  //   // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  //   "GLobal short sizeUsd and collateralUsd BTC",
  //   BNToUSDRepresentation(sizeUsdshortbyToken['BTC'], USDC_DECIMALS),
  //   BNToUSDRepresentation(collateralUsdshortbyToken['BTC'], USDC_DECIMALS),
  // );
  //   console.log(
  //   // "Global long unrealized PNL ($)",
  //   // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  //   "GLobal short sizeUsd and collateralUsd ETH",
  //   BNToUSDRepresentation(sizeUsdshortbyToken['ETH'], USDC_DECIMALS),
  //   BNToUSDRepresentation(collateralUsdshortbyToken['ETH'], USDC_DECIMALS),
  // );
  const size: Record<string, BN> = {
    SOL: new BN(0),
    ETH: new BN(0),
    BTC: new BN(0),
  };
  // size['SOL'] = sizeUsdlongbyToken['SOL'] + collateralUsdlongbyToken['SOL'] - sizeUsdshortbyToken['SOL'] - collateralUsdshortbyToken['SOL'];
  size['SOL'] = sizeUsdlongbyToken['SOL'].add(collateralUsdlongbyToken['SOL']);
  size['ETH'] = sizeUsdlongbyToken['ETH'].add(collateralUsdlongbyToken['ETH']);
  size['BTC'] = sizeUsdlongbyToken['BTC'].add(collateralUsdlongbyToken['BTC']);
  // console.log(
  //   "Global size SOL",
  //   BNToUSDRepresentation(size['SOL'], USDC_DECIMALS),
  // );
  //   console.log(
  //   "Global size BTC",
  //   BNToUSDRepresentation(size['BTC'], USDC_DECIMALS),
  // );
  // console.log(
  //   "Global size ETH",
  //   BNToUSDRepresentation(size['ETH'], USDC_DECIMALS),
  // );
  const guaranteedUsd: Record<string, BN> = {
    SOL: new BN(0),
    BTC: new BN(0),
    ETH: new BN(0),
  };
  guaranteedUsd['SOL'] = sizeUsdlongbyToken['SOL'].sub(collateralUsdlongbyToken['SOL']);
  guaranteedUsd['ETH'] = sizeUsdlongbyToken['ETH'].sub(collateralUsdlongbyToken['ETH']);
  guaranteedUsd['BTC'] = sizeUsdlongbyToken['BTC'].sub(collateralUsdlongbyToken['BTC']);
  // console.log(
  //   "Global guaranteedUsd SOL",
  //   BNToUSDRepresentation(guaranteedUsd['SOL'], USDC_DECIMALS),
  // );
  // console.log(
  //   "Global guaranteedUsd BTC",
  //   BNToUSDRepresentation(guaranteedUsd['BTC'], USDC_DECIMALS),
  // );
  // console.log(
  //   "Global guaranteedUsd ETH",
  //   BNToUSDRepresentation(guaranteedUsd['ETH'], USDC_DECIMALS),
  // );
  // console.log(
  //   "Global size long and short",
  //   BNToUSDRepresentation(globalsize.long, 0),
  //   BNToUSDRepresentation(globalsize.short, 0),
  // );
  // console.log(
  //   "Global short size SOL",
  //   BNToUSDRepresentation(shortsize['SOL'], USDC_DECIMALS),
  // );
  // console.log(
  //   "Global short size BTC",
  //   BNToUSDRepresentation(shortsize['BTC'], USDC_DECIMALS),
  // );
  // console.log(
  //   "Global short size ETH",
  //   BNToUSDRepresentation(shortsize['ETH'], USDC_DECIMALS),
  // );
  
  // const custodyPubkey_BTC = new PublicKey(CUSTODY_PUBKEY.BTC);

  OraclePriceNow['SOL'] = await fetchOraclePrice(CUSTODY_PUBKEYS.SOL);
  OraclePriceNow['ETH'] = await fetchOraclePrice(CUSTODY_PUBKEYS.ETH);
  OraclePriceNow['BTC'] = await fetchOraclePrice(CUSTODY_PUBKEYS.BTC);
  globalowned['SOL'] = await getCustodyInstance(CUSTODY_PUBKEYS.SOL);
  globalowned['ETH'] = await getCustodyInstance(CUSTODY_PUBKEYS.ETH);
  globalowned['BTC'] = await getCustodyInstance(CUSTODY_PUBKEYS.BTC);
  shortsize['SOL'] = getsize_real(globalowned['SOL'], shortsize['SOL']);
  shortsize['ETH'] = getsize_real(globalowned['ETH'], shortsize['ETH']);
  shortsize['BTC'] = getsize_real(globalowned['BTC'], shortsize['BTC']);

  const getPoolSum = new BN(await getPoolAum()).div(new BN(10).pow(new BN(USDC_DECIMALS)));
  realsize['SOL'] = getAssetAmountUsd(OraclePriceNow['SOL'], globalowned['SOL'].assets.owned.add(shortsize['SOL']), globalowned['SOL'].decimals).sub(size['SOL']).div(getPoolSum);
  realsize['ETH'] = getAssetAmountUsd(OraclePriceNow['ETH'], globalowned['ETH'].assets.owned.add(shortsize['ETH']), globalowned['ETH'].decimals).sub(size['ETH']).div(getPoolSum);
  realsize['BTC'] = getAssetAmountUsd(OraclePriceNow['BTC'], globalowned['BTC'].assets.owned.add(shortsize['BTC']), globalowned['BTC'].decimals).sub(size['BTC']).div(getPoolSum);

  console.log(
    "Global real ratio SOL",
    BNToUSDRepresentation(realsize['SOL'], USDC_DECIMALS,4),
  );
  console.log(
    "Global real ratio BTC",
    BNToUSDRepresentation(realsize['BTC'], USDC_DECIMALS,4),
  );
  console.log(
    "Global real ratio ETH",
    BNToUSDRepresentation(realsize['ETH'], USDC_DECIMALS,4),
  );
  // console.log("Global owned SOL", globalowned['SOL'].assets.owned.toString());
  // console.log("Global owned BTC", globalowned['BTC'].assets.owned.toString());
  // console.log("Global owned ETH", globalowned['ETH'].assets.owned.toString());
  // console.log("Global owned SOL", globalowned['SOL'].assets.locked.toString());
  // console.log("Global owned BTC", globalowned['BTC'].assets.locked.toString());
  // console.log(
  //   "Global long unrealized PNL ($)",
  //   BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  // );
  // console.log(
  //   "Global long unrealized PNL ($)",
  //   BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  // );
  // console.log(
  //   // "Global long unrealized PNL ($)",
  //   // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  //   "GLobal short sizeUsd and collateralUsd ETH",
  //   BNToUSDRepresentation(sizeUsdshortbyToken['ETH'], USDC_DECIMALS),
  //   BNToUSDRepresentation(collateralUsdshortbyToken['ETH'], USDC_DECIMALS),
  // );
  // console.log(
  //   "Global long size SOL",
  //   BNToUSDRepresentation(sizeUsdlongbyToken['SOL']+collateralUsdlongbyToken['SOL']-sizeUsdshortbyToken['SOL']-collateralUsdshortbyToken['SOL'], USDC_DECIMALS),
  // );
  //   console.log(
  //   "Global long size ETH",
  //   BNToUSDRepresentation(sizeUsdlongbyToken['ETH']+collateralUsdlongbyToken['ETH']-sizeUsdshortbyToken['ETH']-collateralUsdshortbyToken['ETH'], USDC_DECIMALS),
  // );
  //     console.log(
  //   "Global long size BTC",
  //   BNToUSDRepresentation(sizeUsdlongbyToken['BTC']+collateralUsdlongbyToken['BTC']-sizeUsdshortbyToken['BTC']-collateralUsdshortbyToken['BTC'], USDC_DECIMALS),
  // );
}



// export async function getGlobalShortsizeUsd() {
//   const gpaResult =
//     await JUPITER_PERPETUALS_PROGRAM.provider.connection.getProgramAccounts(
//       JUPITER_PERPETUALS_PROGRAM.programId,
//       {
//         commitment: "confirmed",
//         filters: [
//           {
//             memcmp:
//               JUPITER_PERPETUALS_PROGRAM.coder.accounts.memcmp("position"),
//           },
//         ],
//       },
//     );

//   const positions = gpaResult.map((item) => {
//     return {
//       publicKey: item.pubkey,
//       account: JUPITER_PERPETUALS_PROGRAM.coder.accounts.decode(
//         "position",
//         item.account.data,
//       ) as IdlAccounts<Perpetuals>["position"],
//     };
//   });

//   // Old positions accounts are not closed, but have `sizeUsd = 0`
//   // i.e. open positions have a non-zero `sizeUsd`
//   const openPositions = positions.filter(
//     (position) => position.account.sizeUsd.gtn(0) && position.account.side.short,
//   );
//   const sizeUsdlongbyToken: Record<string, BN> = {
//     SOL: new BN(0),
//     ETH: new BN(0),
//     BTC: new BN(0),
//   };
//   // NOTE: We assume the token price is $100 (scaled to 6 decimal places as per the USDC mint) as an example here for simplicity
//   const tokenPrice = new BN(100_000_000);

//   let totalPnl = new BN(0);

//   openPositions.forEach((position) => {
//     // const token = position.account.custody.toString();
//     // console.log("Position custody: ", token);
//     const custodyAddress = position.account.custody.toString();
//     let token: string | undefined = undefined;
//     if (custodyAddress === CUSTODY_PUBKEY.SOL) token = "SOL";
//     else if (custodyAddress === CUSTODY_PUBKEY.ETH) token = "ETH";
//     else if (custodyAddress === CUSTODY_PUBKEY.BTC) token = "BTC";
//     if (!token) return; // 跳过非目标币种
//     sizeUsdlongbyToken[token] = sizeUsdlongbyToken[token].add(position.account.sizeUsd);
//     // const [hasProfit, pnl] = getPnlForSize(
//     //   position.account.sizeUsd,
//     //   position.account.price,
//     //   position.account.side.long ? "long" : "short",
//     //   tokenPrice,
//     // );

//     // totalPnl = hasProfit ? totalPnl.add(pnl) : totalPnl.sub(pnl);
//   });

//   console.log(
//     // "Global long unrealized PNL ($)",
//     // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
//     "GLobal short sizeUsd SOL",
//     BNToUSDRepresentation(sizeUsdlongbyToken['SOL'], USDC_DECIMALS),
//   );
//   console.log(
//     // "Global long unrealized PNL ($)",
//     // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
//     "GLobal short sizeUsd BTC",
//     BNToUSDRepresentation(sizeUsdlongbyToken['BTC'], USDC_DECIMALS),
//   );
//   console.log(
//     // "Global long unrealized PNL ($)",
//     // BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
//     "GLobal short sizeUsd ETH",
//     BNToUSDRepresentation(sizeUsdlongbyToken['ETH'], USDC_DECIMALS),
//   );
// }

export async function getGlobalLongUnrealizedPnlEstimate() {
  const custodies = await JUPITER_PERPETUALS_PROGRAM.account.custody.all();

  let totalPnl = new BN(0);

  custodies.forEach((custody) => {
    // NOTE: We assume the token price is $100 (scaled to 6 decimal places as per the USDC mint) as an example here for simplicity
    const tokenPrice = new BN(100_000_000);
    const lockedUsd = custody.account.assets.locked.mul(tokenPrice);
    totalPnl = totalPnl.add(
      lockedUsd.sub(custody.account.assets.guaranteedUsd),
    );
  });

  console.log(
    "Global long unrealized PNL estimate ($)",
    BNToUSDRepresentation(totalPnl, USDC_DECIMALS),
  );
}

getGlobalLongsizeUsd().catch(console.error);
// getGlobalShortsizeUsd().catch(console.error);