// 在test-rpc.ts中添加Oracle地址测试
import { PublicKey } from "@solana/web3.js";
import { RPC_CONNECTION } from "../constants";

async function testOracleAccount() {
  // SOL的Doves Oracle地址
  const oraclePubkey = new PublicKey("DoVEsk76QybCEHQGzkvYPWLQu9gzNoZZZt3TPiL597e");
  try {
    // 检查账户是否存在
    const accountInfo = await RPC_CONNECTION.getAccountInfo(oraclePubkey);
    if (accountInfo) {
      console.log("Oracle exist", accountInfo.data.length);
    } else {
      console.error("Oracle does not exist");
    }
  } catch (error) {
    console.error("查询Oracle账户失败", error);
  }
}

testOracleAccount();