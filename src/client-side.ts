import { AergoClient, Contract } from "@herajs/client";
import { identityFromPrivateKey, signTransaction, hashTransaction } from '@herajs/crypto';
import fs from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import bs58check from "bs58check";
import { sleep } from "./utils";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.test";
dotenv.config({ path: envFile });

export async function deployContract(aergo: AergoClient, contractPath: string) : Promise<string> {
  
  const contractCode = fs
    .readFileSync(resolve(process.cwd(), contractPath))
    .toString()
    .trim();
  const contractDeploy = Contract.fromCode(contractCode);

  const identity = identityFromPrivateKey(bs58check.decode(process.env.PRIVATE_KEY || ''));

  const nonce = await aergo.getNonce(identity.address);

  const tx : any = {
    nonce: nonce + 1,
    from: identity.address,
    to: null,
    payload: contractDeploy.asPayload([10]),
    chainIdHash: await aergo.getChainIdHash(),
  };
  tx.sign = await signTransaction(tx, identity.keyPair);
  tx.hash = await hashTransaction(tx, 'bytes');
  const txHash = await aergo.sendSignedTransaction(tx);

  await sleep(3000);
  const receipt = await aergo.getTransactionReceipt(txHash);
  console.log("receipt: ", receipt);
  return receipt.contractaddress.toString();
}