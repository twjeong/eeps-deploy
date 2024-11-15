import { AergoClient, Contract, GrpcProvider } from "@herajs/client";
import fs from "fs";
import { resolve } from "path";
import dotenv from 'dotenv';
import contractAbi from "./contract/user.abi.json";

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.test';
dotenv.config({ path: envFile });

async function longPolling(
  pollFn: () => Promise<any>,
  conditionFn: (result: any) => boolean,
  interval: number
): Promise<any> {
  while (true) {
    const result = await pollFn();
    if (conditionFn(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let receipt;
  const aergo = new AergoClient(
    {},
    new GrpcProvider({ url: process.env.ENDPOINT })
  );
  const myAddress = process.env.ACCOUNT_ADDRESS;
  if (!myAddress) {
    throw new Error("ACCOUNT_ADDRESS is not defined in the environment variables");
  }
  const contractCode = fs
    .readFileSync(resolve(__dirname, "./contract/user.lua"))
    .toString()
    .trim();

  const contractDeploy = Contract.fromCode(contractCode);
  const tx: any = {
    from: myAddress,
    to: null,
    payload: contractDeploy.asPayload([10]),
    chainIdHash: await aergo.getChainIdHash(),
  };

  await aergo.accounts.unlock(myAddress, "jkljkl..1");

  const deployTxhash = await aergo.accounts.sendTransaction(tx);
  await sleep(3000);
  receipt = await aergo.getTransactionReceipt(deployTxhash);
  //console.log(receipt);

  const contractAddress = receipt.contractaddress;
  console.log("contract address: ", contractAddress.toString());

  const contract: any =
    Contract.fromAbi(contractAbi).setAddress(contractAddress);

  // add
  const callTx = contract.add('nathan', myAddress).asTransaction({
    from: myAddress,
    chainIdHash: await aergo.getChainIdHash(),
  });
  const calltxhash = await aergo.accounts.sendTransaction(callTx);
  await sleep(3000);
  receipt = await aergo.getTransactionReceipt(calltxhash);
  console.log(receipt);

  // get
  const result = await aergo.queryContract(contract.get("nathan"));
  console.log('get() return: ', result);

  // add-2
  {
    const callTx = contract.add('nathan', myAddress).asTransaction({
      from: myAddress,
      chainIdHash: await aergo.getChainIdHash(),
    });
    const calltxhash = await aergo.accounts.sendTransaction(callTx);
    await sleep(2000);
    receipt = await aergo.getTransactionReceipt(calltxhash);
    console.log(receipt);
  }
}

main().catch(console.error);
