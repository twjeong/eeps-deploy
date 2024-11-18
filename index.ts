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
  console.log("receipt: ", receipt);
  const contractAddress = receipt.contractaddress.toString();
  writeEnvVariable("CONTRACT_ADDRESS", contractAddress);
  return contractAddress;
}

async function callContract(
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
    fs.readFileSync(resolve(__dirname, abiPath)).toString()
  );
  const contract: any = Contract.fromAbi(abi).setAddress(process.env.CONTRACT_ADDRESS);
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
    fs.readFileSync(resolve(__dirname, abiPath)).toString()
  );
  const contract: any = Contract.fromAbi(abi).setAddress(process.env.CONTRACT_ADDRESS);
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

  if (command === "create-account") {
    const account = await aergo.accounts.create("jkljkl..1");
    writeEnvVariable("ACCOUNT_ADDRESS", account.toString());
    console.log("account: ", account.toString());
  }
  else if (command === "deploy") {
    if (args.length < 2) {
      throw new Error("Usage: node index.js deploy <contractPath>");
    }
    const contractPath = args[1];
    console.log(
      "contract address: ",
      await deployContract(aergo, contractPath)
    );
  } else if (command === "call") {
    if (args.length < 4) {
      throw new Error(
        "Usage: node index.js call <abiPath> <method> [args]"
      );
    }
    const abiPath = args[1];
    const method = args[2];
    const methodArgs = args.slice(3) || [];

    console.log(
      "receipt: ",
      await callContract(aergo, abiPath, method, methodArgs)
    );
  } else if (command === "query") {
    if (args.length < 4) {
      throw new Error(
        "Usage: node index.js query <abiPath> <method> [args]"
      );
    }
    const abiPath = args[1];
    const method = args[2];
    const methodArgs = args.slice(3) || [];

    console.log(
      await queryContract(aergo, abiPath, method, methodArgs)
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}

function writeEnvVariable(key: string, value: string): void {
  const envPath = resolve(__dirname, envFile);
  let envContent = '';

  // .env 파일이 존재하는지 확인
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const envVars = envContent.split('\n').filter(line => line.trim() !== '');
  const existingVarIndex = envVars.findIndex(line => line.startsWith(`${key}=`));

  if (existingVarIndex !== -1) {
    // 기존 키 업데이트
    envVars[existingVarIndex] = `${key}=${value}`;
  } else {
    // 새로운 키 추가
    envVars.push(`${key}=${value}`);
  }

  fs.writeFileSync(envPath, envVars.join('\n'));
}


main().catch(console.error);
