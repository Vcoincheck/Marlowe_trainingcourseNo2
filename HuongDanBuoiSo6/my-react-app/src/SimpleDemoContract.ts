import {
  Contract,
  datetoTimeout,
  lovelace,
  Party,
} from "@marlowe.io/language-core-v1";

function mkSimpleContract(
  amount: number,
  sender: Party,
  receiver: Party
): Contract {
  const bintAmount = BigInt(amount);

  const contract: Contract = {
    when: [
      {
        then: "close",
        case: {
          party: sender,
          of_token: lovelace,
          into_account: receiver,
          deposits: bintAmount,
        },
      },
    ],
    timeout_continuation: "close",
    timeout: datetoTimeout(new Date("2025-01-17 12:00:00")),
  };

  return contract;
}

export default mkSimpleContract;
