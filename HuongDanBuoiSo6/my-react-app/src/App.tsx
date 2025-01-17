import { useState, useRef } from "react";
import "./App.css";
import * as wallet from "@marlowe.io/wallet";
import { mkRuntimeLifecycle } from "@marlowe.io/runtime-lifecycle/browser";
import { SupportedWalletName } from "@marlowe.io/wallet/browser";
import mkSimpleContract from "./SimpleDemoContract";
import {
  datetoTimeout,
  IDeposit,
  Input,
  lovelace,
  Party,
} from "@marlowe.io/language-core-v1";
import { ApplyApplicableInputRequest } from "@marlowe.io/runtime-lifecycle/api";

function App() {
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const amountRef = useRef<HTMLInputElement>(null);
  const receiverAddrRef = useRef<HTMLInputElement>(null);

  // Options for the dropdown
  const options: string[] = wallet
    .getInstalledWalletExtensions()
    .map((wallet) => wallet.name)
    .map(
      (walletName) => walletName.charAt(0).toUpperCase() + walletName.slice(1)
    );

  async function handleSubmit() {
    const amount = amountRef.current?.value || "";
    const receiverAddr = receiverAddrRef.current?.value || "";

    console.log(`The amount you entered is ${amount} ADA`);
    console.log(`The receiver's address you entered is ${receiverAddr}`);

    // 1. Kết nối đến server Runtime Backend
    const supportedWallet = selectedWallet.toLowerCase() as SupportedWalletName;

    const runtimeLifecycle = await mkRuntimeLifecycle({
      walletName: supportedWallet,
      runtimeURL: "https://preprod.100.runtime.marlowe-lang.org",
    });

    // 2. Tạo ra hợp đồng theo dữ liệu mà người dùng cung cấp (số lượng ADA muốn gửi và địa chỉ của người nhận)
    const amountNumber = parseInt(amount);
    const browserWallet = await wallet.mkBrowserWallet(supportedWallet);

    const senderAddr = await browserWallet.getChangeAddress();
    const sender: Party = {
      address: senderAddr,
    };
    const receiver: Party = {
      address: receiverAddr,
    };

    const myContract = mkSimpleContract(amountNumber, sender, receiver);

    // 3. Triển khai hợp đồng lên blockchain
    const contract = await runtimeLifecycle.newContractAPI.create({
      contract: myContract,
    });

    // 4. Đợi transaction triển khai hợp đồng được đóng block
    await contract.waitForConfirmation();

    // 5. Chuẩn bị những cái inputs để tạo ra request chuyển tiền vào hợp đồng
    const bintAmount = BigInt(amountNumber);

    const deposit: IDeposit = {
      input_from_party: sender,
      that_deposits: bintAmount,
      of_token: lovelace,
      into_account: receiver,
    };

    const inputs: Input[] = [deposit];
    const depositRequest: ApplyApplicableInputRequest = {
      input: {
        inputs: inputs,
        environment: {
          timeInterval: {
            from: datetoTimeout(new Date("2025-01-18 12:00:00")),
            to: datetoTimeout(new Date("2025-01-18 12:30:00")),
          },
        },
      },
    };

    // 6. Thực hiện hành động chuyển tiền vào hợp đồng
    const depositTxId = await contract.applyInput(depositRequest);

    // 7. Đợi transaction chuyển tiền vào hợp đồng được đóng block
    const depositResult = await browserWallet.waitConfirmation(depositTxId);

    if (depositResult == true) {
      console.log(`Đã chuyển tiền thành công, tx id là ${depositTxId}`);
    }
  }

  // Handle selection change
  const handleWalletChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWallet(event.target.value);
  };

  return (
    <div className="container">
      <h1>My Simple DApp</h1>

      <label htmlFor="dropdown">Connect wallet </label>
      <select
        id="dropdown"
        value={selectedWallet}
        onChange={handleWalletChange}
      >
        <option value="" disabled>
          Select a wallet
        </option>

        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>

      {selectedWallet && (
        <div className="contractParams">
          <div>
            <label htmlFor="amountInput">Amount (ADA): </label>
            <input id="amountInput" type="number" ref={amountRef} />
          </div>
          <div>
            <label htmlFor="receiverAddrInput">Receiver address: </label>
            <input id="receiverAddrInput" type="text" ref={receiverAddrRef} />
          </div>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      )}
    </div>
  );
}

export default App;
