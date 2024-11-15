"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@herajs/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
function longPolling(pollFn, conditionFn, interval) {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            const result = yield pollFn();
            if (conditionFn(result)) {
                return result;
            }
            yield new Promise((resolve) => setTimeout(resolve, interval));
        }
    });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let receipt;
        const aergo = new client_1.AergoClient({}, new client_1.GrpcProvider({ url: "testnet-api.aergo.io:7845" }));
        const myAddress = "AmLom8y5LK341mTERsRvUkdWzBmCmqrLmMS6nr1rFBM43opkSKDq"; // Enter your account address or name
        const contractCode = fs_1.default
            .readFileSync((0, path_1.resolve)(__dirname, "../contract/user.lua"))
            .toString()
            .trim();
        const contractDeploy = client_1.Contract.fromCode(contractCode);
        const tx = {
            from: myAddress,
            to: null,
            payload: contractDeploy.asPayload([10]),
            chainIdHash: yield aergo.getChainIdHash(),
        };
        yield aergo.accounts.unlock(myAddress, "jkljkl..1");
        const deployTxhash = yield aergo.accounts.sendTransaction(tx);
        yield sleep(3000);
        receipt = yield aergo.getTransactionReceipt(deployTxhash);
        //console.log(receipt);
        const contractAddress = receipt.contractaddress;
        console.log("contract address: ", contractAddress.toString());
        // const contract: any =
        //   Contract.fromAbi(contractAbi).setAddress(contractAddress);
        // // add
        // const callTx = contract.add('nathan', myAddress).asTransaction({
        //   from: myAddress,
        //   chainIdHash: await aergo.getChainIdHash(),
        // });
        // const calltxhash = await aergo.accounts.sendTransaction(callTx);
        // await sleep(3000);
        // receipt = await aergo.getTransactionReceipt(calltxhash);
        // console.log(receipt);
        // // get
        // const result = await aergo.queryContract(contract.get("nathan"));
        // console.log('get() return: ', result);
        // // add-2
        // {
        //   const callTx = contract.add('nathan', myAddress).asTransaction({
        //     from: myAddress,
        //     chainIdHash: await aergo.getChainIdHash(),
        //   });
        //   const calltxhash = await aergo.accounts.sendTransaction(callTx);
        //   await sleep(2000);
        //   receipt = await aergo.getTransactionReceipt(calltxhash);
        //   console.log(receipt);
        // }
    });
}
main().catch(console.error);
