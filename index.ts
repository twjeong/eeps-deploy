import { AergoClient, GrpcProvider } from "@herajs/client";
import {
  createIdentity,
} from "@herajs/crypto";
import dotenv from "dotenv";
import bs58check from "bs58check";
import { writeEnvVariable, sleep } from "./src/utils";
import { transfer } from "./src/transfer";
import { deployContract as deployContractClientSide } from "./src/client-side";
import {
  deployContract as deployContractServerSide,
  callContract as callContractServerSide,
  queryContract as queryContractServerSide,
} from "./src/server-side";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.test";
dotenv.config({ path: envFile });

const myAddress = process.env.ACCOUNT_ADDRESS;

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
  } else if (command === "create-account-client-side") {
    const identity = createIdentity();
    const privateKey = bs58check.encode(identity.privateKey);
    writeEnvVariable("PRIVATE_KEY", privateKey);
    console.log("privateKey: ", privateKey);
    console.log("address: ", identity.address);
  } else if (command === "deploy") {
    if (args.length < 2) {
      throw new Error("Usage: node index.js deploy <contractPath>");
    }
    const contractPath = args[1];
    console.log(
      "contract address: ",
      await deployContractServerSide(aergo, contractPath)
    );
  } else if (command === "deploy-client-side") {
    if (args.length < 2) {
      throw new Error("Usage: node index.js deploy-client-side <contractPath>");
    }
    const contractPath = args[1];
    console.log(
      "contract address: ",
      await deployContractClientSide(aergo, contractPath)
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
      await callContractServerSide(aergo, abiPath, method, methodArgs)
    );
  }  else if (command === "query") {
    if (args.length < 4) {
      throw new Error("Usage: node index.js query <abiPath> <method> [args]");
    }
    const abiPath = args[1];
    const method = args[2];
    const methodArgs = args.slice(3) || [];

    console.log(
      await queryContractServerSide(aergo, abiPath, method, methodArgs)
    );
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

main().catch(console.error);
