import AergoClient from "@herajs/client";
import dotenv from "dotenv";
import { loadCsvFile, sleep } from "./utils";
import fs from "fs";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.test";
dotenv.config({ path: envFile });

const myAddress = process.env.ACCOUNT_ADDRESS;

export async function transfer(aergo: AergoClient, csvFile: string) {
  if (!myAddress) {
    throw new Error(
      "ACCOUNT_ADDRESS is not defined in the environment variables"
    );
  }

  let recipients: { recipient: string; value: number }[] = await loadCsvFile(
    csvFile
  );
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
