import { AergoClient, Contract, GrpcProvider } from "@herajs/client";
import fs from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import contractAbi from "./contract/user.abi.json";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.test";
dotenv.config({ path: envFile });

const myAddress = process.env.ACCOUNT_ADDRESS;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deployContract(
  aergo: AergoClient,
  contractPath: string
): Promise<string> {
  const contractCode = fs
    .readFileSync(resolve(__dirname, contractPath))
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
  return receipt.contractaddress.toString();
}

async function callContract(
  aergo: AergoClient,
  contractAddress: string,
  abiPath: any,
  method: string,
  args: any[]
): Promise<any> {
  if (!myAddress) {
    throw new Error(
      "ACCOUNT_ADDRESS is not defined in the environment variables"
    );
  }
  await aergo.accounts.unlock(myAddress, "jkljkl..1");

  if (!Array.isArray(args)) {
    throw new TypeError("args must be an array");
  }

  const abi = JSON.parse(
    fs.readFileSync(resolve(__dirname, abiPath)).toString()
  );
  const contract: any = Contract.fromAbi(abi).setAddress(contractAddress);
  const callTx = contract[method](...args).asTransaction({
    from: myAddress,
    chainIdHash: await aergo.getChainIdHash(),
  });
  const callTxhash = await aergo.accounts.sendTransaction(callTx);
  await sleep(3000);
  return await aergo.getTransactionReceipt(callTxhash);
}

async function queryContract(
  aergo: AergoClient,
  contractAddress: string,
  abiPath: any,
  method: string,
  args: any[]
): Promise<any> {
  if (!Array.isArray(args)) {
    throw new TypeError("args must be an array");
  }

  const abi = JSON.parse(
    fs.readFileSync(resolve(__dirname, abiPath)).toString()
  );
  const contract: any = Contract.fromAbi(abi).setAddress(contractAddress);
  return await aergo.queryContract(contract[method](...args));
}

async function main() {
  const args = process.argv.slice(2); // 명령어 인자 추출
  if (args.length < 1) {
    throw new Error("Usage: node index.js <command> [options]");
  }
  const command = args[0];

  const aergo = new AergoClient(
    {},
    new GrpcProvider({ url: process.env.ENDPOINT })
  );

  if (command === "deploy") {
    if (args.length < 2) {
      throw new Error("Usage: node index.js deploy <contractPath>");
    }
    const contractPath = args[1];
    console.log(
      "contract address: ",
      await deployContract(aergo, contractPath)
    );
  } else if (command === "call") {
    if (args.length < 5) {
      throw new Error(
        "Usage: node index.js call <contractAddress> <abiPath> <method> [args]"
      );
    }
    const contractAddress = args[1];
    const abiPath = args[2];
    const method = args[3];
    const methodArgs = args.slice(4) || [];

    console.log(
      "receipt: ",
      await callContract(aergo, contractAddress, abiPath, method, methodArgs)
    );
  } else if (command === "query") {
    if (args.length < 4) {
      throw new Error(
        "Usage: node index.js query <contractAddress> <abiPath> <method> [args]"
      );
    }
    const contractAddress = args[1];
    const abiPath = args[2];
    const method = args[3];
    const methodArgs = args.slice(4) || [];

    console.log(
      await queryContract(aergo, contractAddress, abiPath, method, methodArgs)
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}

main().catch(console.error);
