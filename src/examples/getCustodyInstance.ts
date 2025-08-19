// 可在 src/utils 或相关目录下定义
import { PublicKey } from "@solana/web3.js";
import { JUPITER_PERPETUALS_PROGRAM } from "../constants";
import { Custody } from "../types";


/**
 * 获取指定托管账户的实例
 * @param custodyPubkey 托管账户的公钥
 * @returns Custody实例
 */
export async function getCustodyInstance(custodyPubkey: PublicKey): Promise<Custody> {
  try {
    const custody = await JUPITER_PERPETUALS_PROGRAM.account.custody.fetch(custodyPubkey);
    return custody as Custody; // 类型断言为Custody类型
  } catch (error) {
    console.error(`Failed to fetch custody data for ${custodyPubkey.toString()}:`, error);
    throw error;
  }
}