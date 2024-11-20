import { AergoClient, Contract, GrpcProvider } from "@herajs/client";
import fs from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import contractAbi from "./contract/user.abi.json";
import csv from "csv-parser";

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
  const contract: any = Contract.fromAbi(abi).setAddress(
    process.env.CONTRACT_ADDRESS
  );
  return await aergo.queryContract(contract[method](...args));
}

async function transfer(aergo: AergoClient, csvFile: string) {
  if (!myAddress) {
    throw new Error(
      "ACCOUNT_ADDRESS is not defined in the environment variables"
    );
  }

  let recipients: { recipient: string; value: number }[] = await loadCsvFile(csvFile);
  const nonce = await aergo.getNonce(myAddress);

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i].recipient;
    const value = recipients[i].value;
    const amount = value.toString();
    await aergo.accounts.unlock(myAddress, "jkljkl..1");
    const tx: any = {
      nonce: nonce + i + 1,
      from: myAddress,
      to: recipient,
      amount: amount,
      chainIdHash: await aergo.getChainIdHash(),
    };
    
    const transferTxhash = await aergo.accounts.sendTransaction(tx);
    sleep(3000);
    //const receipt = await aergo.getTransactionReceipt(transferTxhash);

    const log = `[${i + 1}]${recipients[i].recipient},${recipients[i].value}`;
    console.log(log);
    fs.appendFile(csvFile + ".log", log + "\n", (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}

async function waitForReceipt(aergo: AergoClient, txHash: string): Promise<any> {
  let receipt = null;
  while (receipt === null) {
    receipt = await aergo.getTransactionReceipt(txHash);
    if (receipt === null) {
      await sleep(500); // 1초 대기 후 다시 시도
    }
  }
  return receipt;
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
  } else if (command === "deploy") {
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
      throw new Error("Usage: node index.js call <abiPath> <method> [args]");
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
      throw new Error("Usage: node index.js query <abiPath> <method> [args]");
    }
    const abiPath = args[1];
    const method = args[2];
    const methodArgs = args.slice(3) || [];

    console.log(await queryContract(aergo, abiPath, method, methodArgs));
  } else if (command === "transfer") {
    if (args.length < 2) {
      throw new Error("Usage: node index.js transfer <csv-file>");
    }
    const csvFile = args[1];
    
    await transfer(aergo, csvFile);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}

function writeEnvVariable(key: string, value: string): void {
  const envPath = resolve(__dirname, envFile);
  let envContent = "";

  // .env 파일이 존재하는지 확인
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const envVars = envContent.split("\n").filter((line) => line.trim() !== "");
  const existingVarIndex = envVars.findIndex((line) =>
    line.startsWith(`${key}=`)
  );

  if (existingVarIndex !== -1) {
    // 기존 키 업데이트
    envVars[existingVarIndex] = `${key}=${value}`;
  } else {
    // 새로운 키 추가
    envVars.push(`${key}=${value}`);
  }

  fs.writeFileSync(envPath, envVars.join("\n"));
}

async function loadCsvFile(csvFile: string): Promise<{ recipient: string; value: number }[]> {
  return new Promise((resolve, reject) => {
    let transfers: any = [];
    fs.createReadStream(csvFile)
      .pipe(csv({ headers: false }))
      .on("data", (row) => {
        transfers.push({
          recipient: row[0],
          value: parseFloat(row[1]),
        });
      })
      .on("end", () => {
        resolve(transfers);
      })
      .on("error", reject);
  });
}

main().catch(console.error);
