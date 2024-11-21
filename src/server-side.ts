import { AergoClient, Contract } from "@herajs/client";
import fs from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import { writeEnvVariable, sleep } from "./utils";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.test";
dotenv.config({ path: envFile });

const myAddress = process.env.ACCOUNT_ADDRESS;

export async function deployContract(
  aergo: AergoClient,
  contractPath: string
): Promise<string> {
  const contractCode = fs
    .readFileSync(resolve(process.cwd(), contractPath))
    .toString()
    .trim();
  const contractDeploy = Contract.fromCode(contractCode);
  const tx: any = {
    from: myAddress,
    to: null,
    payload: contractDeploy.asPayload([10]),
    chainIdHash: await aergo.getChainIdHash(),
  };

  if (!myAddress) {
    throw new Error(
      "ACCOUNT_ADDRESS is not defined in the environment variables"
    );
  }
  await aergo.accounts.unlock(myAddress, "jkljkl..1");

  const deployTxhash = await aergo.accounts.sendTransaction(tx);
  await sleep(3000);
  const receipt = await aergo.getTransactionReceipt(deployTxhash);
  console.log("receipt: ", receipt);
  const contractAddress = receipt.contractaddress.toString();
  writeEnvVariable("CONTRACT_ADDRESS", contractAddress);
  return contractAddress;
}

export async function callContract(
  aergo: AergoClient,
  abiPath: any,
  method: string,
  args: any[]
): Promise<any> {
  if (!myAddress) {
    throw new Error(
      "ACCOUNT_ADDRESS is not defined in the environment variables"
    );
  }

  if (process.env.CONTRACT_ADDRESS === undefined) {
    throw new Error(
      "CONTRACT_ADDRESS is not defined in the environment variables"
    );
  }
  await aergo.accounts.unlock(myAddress, "jkljkl..1");

  if (!Array.isArray(args)) {
    throw new TypeError("args must be an array");
  }

  const abi = JSON.parse(
    fs.readFileSync(resolve(process.cwd(), abiPath)).toString()
  );
  const contract: any = Contract.fromAbi(abi).setAddress(
    process.env.CONTRACT_ADDRESS
  );
  const callTx = contract[method](...args).asTransaction({
    from: myAddress,
    chainIdHash: await aergo.getChainIdHash(),
  });
  const callTxhash = await aergo.accounts.sendTransaction(callTx);
  await sleep(3000);
  return await aergo.getTransactionReceipt(callTxhash);
}

export async function queryContract(
  aergo: AergoClient,
  abiPath: any,
  method: string,
  args: any[]
): Promise<any> {
  if (process.env.CONTRACT_ADDRESS === undefined) {
    throw new Error(
      "CONTRACT_ADDRESS is not defined in the environment variables"
    );
  }

  if (!Array.isArray(args)) {
    throw new TypeError("args must be an array");
  }

  const abi = JSON.parse(
    fs.readFileSync(resolve(process.cwd(), abiPath)).toString()
  );
  const contract: any = Contract.fromAbi(abi).setAddress(
    process.env.CONTRACT_ADDRESS
  );
  return await aergo.queryContract(contract[method](...args));
}