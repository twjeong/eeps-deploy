import * as fs from 'fs';
import { resolve } from 'path';
import csv from 'csv-parser';
import dotenv from "dotenv";

export function writeEnvVariable(key: string, value: string,): void {
  const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.test";
  dotenv.config({ path: envFile });

  const envPath = resolve(process.cwd(), envFile);
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

export async function loadCsvFile(csvFile: string): Promise<{ recipient: string; value: number }[]> {
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

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}