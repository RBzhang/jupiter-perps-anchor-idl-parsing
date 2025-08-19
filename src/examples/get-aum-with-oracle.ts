import { PublicKey } from "@solana/web3.js";
import { OraclePrice } from "../types";
import { dovesProgram, DOVES_ORACLES } from "./poll-and-stream-oracle-price-updates";
import { BNToUSDRepresentation } from "../utils";
// 根据托管账户公钥获取对应的 OraclePrice
export async function fetchOraclePrice(custodyPubkey: PublicKey): Promise<OraclePrice> {
  // 找到托管账户对应的 Doves Oracle 地址
  const oracleInfo = DOVES_ORACLES.find(item => item.custody.equals(custodyPubkey));
  if (!oracleInfo) {
    throw new Error(`No oracle found for custody ${custodyPubkey.toString()}`);
  }

  // 从 Doves Oracle 读取价格数据
  const priceFeed = await dovesProgram.account.priceFeed.fetch(oracleInfo.publicKey);
  
  // 转换为 OraclePrice 格式
  return {
    price: priceFeed.price,    // 价格数值（BN 类型）
    exponent: priceFeed.expo,   // 小数位数（如 USDC 为 -6）
  };
}
// export type CustodyToOraclePrice = Record<string, OraclePrice>;

// export async function fetchAndUpdateOraclePriceData(cache: CustodyToOraclePrice) {
//   const dovesPubkey = DOVES_ORACLES.map(({ publicKey }) => publicKey);
//   const feeds = await dovesProgram.account.priceFeed.fetchMultiple(dovesPubkey);

//   DOVES_ORACLES.forEach(({ custody }, index) => {
//     const feed = feeds[index];

//     if (!feed) {
//       throw new Error(
//         `Failed to fetch latest oracle price data for: ${custody.toString()}`,
//       );
//     }

//     const data: OraclePrice = {
//       price: feed.price,
//       // priceUsd: BNToUSDRepresentation(feed.price, Math.abs(feed.expo)),
//       // timestamp: feed.timestamp.toNumber(),
//       expo: feed.expo,
//     };

//     cache[custody.toString()] = data;
//   });
// }
