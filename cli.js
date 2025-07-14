const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");
const { Blockchain, Transactions } = require("./blockchain/blockchain");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

// Load or initialize blockchain
let savjeeCoin;
if (fs.existsSync("chain.json")) {
  const chainData = JSON.parse(fs.readFileSync("chain.json"));
  savjeeCoin = new Blockchain();
  savjeeCoin.loadChain(chainData);
} else {
  savjeeCoin = new Blockchain();
}

let myKey;
let myWalletAddress;

// 💥 Welcome Banner
console.clear();
console.log(chalk.cyanBright("========================================="));
console.log(chalk.greenBright.bold("     🚀 Welcome to Raunak's Blockchain    "));
console.log(chalk.cyanBright("=========================================\n"));

// 🧠 Load wallet if exists
if (fs.existsSync("wallet.json")) {
  const walletData = JSON.parse(fs.readFileSync("wallet.json"));
  myKey = ec.keyFromPrivate(walletData.privateKey);
  myWalletAddress = walletData.publicKey;
  console.log(chalk.yellow("🔐 Wallet loaded from wallet.json\n"));
}

mainMenu();

function mainMenu() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "action",
        message: chalk.blueBright("Choose an action:"),
        choices: [
          "Generate new wallet",
          "View my balance",
          "Create and sign transaction",
          "Mine pending transactions",
          "View blockchain",
          "Exit",
        ],
      },
    ])
    .then((answers) => {
      switch (answers.action) {
        case "Generate new wallet":
          generateWallet();
          break;
        case "View my balance":
          viewBalance();
          break;
        case "Create and sign transaction":
          createTransaction();
          break;
        case "Mine pending transactions":
          mineTransactions();
          break;
        case "View blockchain":
          viewBlockchain();
          break;
        case "Exit":
          console.log(chalk.magentaBright("\n👋 Exiting... See you soon!\n"));
          process.exit();
      }
    });
}

function generateWallet() {
  myKey = ec.genKeyPair();
  myWalletAddress = myKey.getPublic("hex");
  const wallet = {
    publicKey: myWalletAddress,
    privateKey: myKey.getPrivate("hex"),
  };
  fs.writeFileSync("wallet.json", JSON.stringify(wallet, null, 2));
  console.log(chalk.green("\n🎉 New wallet created and saved to wallet.json"));
  console.log(chalk.yellow("Public Address:"), myWalletAddress);
  mainMenu();
}

function viewBalance() {
  if (!myWalletAddress) {
    console.log(chalk.red("\n⚠️  Please generate a wallet first.\n"));
  } else {
    const balance = savjeeCoin.getBalanceOfAddress(myWalletAddress);
    console.log(chalk.green("\n💰 Your current balance:"), chalk.bold(`${balance} coins\n`));
  }
  mainMenu();
}

function createTransaction() {
  if (!myWalletAddress || !myKey) {
    console.log(chalk.red("\n⚠️  Generate or load a wallet first.\n"));
    return mainMenu();
  }

  inquirer
    .prompt([
      {
        type: "input",
        name: "toAddress",
        message: "🔁 Enter recipient's public address:",
      },
      {
        type: "input",
        name: "amount",
        message: "💸 Enter amount to send:",
        validate: (value) => (!isNaN(value) && value > 0) || "Enter a valid number",
      },
    ])
    .then(({ toAddress, amount }) => {
      const tx = new Transactions(myWalletAddress, toAddress, parseFloat(amount));
      tx.signTransaction(myKey);
      try {
        savjeeCoin.addTransaction(tx);
        console.log(chalk.green("\n✅ Transaction signed and added to pending list.\n"));
      } catch (err) {
        console.log(chalk.red(`❌ Error: ${err.message}`));
      }
      mainMenu();
    });
}

function mineTransactions() {
  if (!myWalletAddress) {
    console.log(chalk.red("\n⚠️  Generate or load a wallet first.\n"));
    return mainMenu();
  }

  savjeeCoin.minePendingTransactions(myWalletAddress);
  fs.writeFileSync("chain.json", JSON.stringify(savjeeCoin, null, 2));
  console.log(chalk.green("\n⛏️  Block mined and chain updated!\n"));
  mainMenu();
}

function viewBlockchain() {
  console.log(chalk.blueBright("\n📦 Blockchain Overview:\n"));
  savjeeCoin.chain.forEach((block, index) => {
    console.log(chalk.yellow(`Block #${index}`));
    console.log("Timestamp:", block.timestamp);
    console.log("Previous Hash:", block.previousHash);
    console.log("Hash:", block.hash);
    console.log("Transactions:");
    console.dir(block.transactions, { depth: null });
    console.log("-------------------------------------------------\n");
  });
  mainMenu();
}
