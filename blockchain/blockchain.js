const SHA256=require('crypto-js/sha256');
const EC=require('elliptic').ec;
const ec=new EC('secp256k1');
class Transactions{
    constructor(fromAddress,toAddress,amount){
        this.fromAddress=fromAddress;
        this.toAddress=toAddress;
        this.amount=amount
        

    }

    calculateHash(){
        return SHA256(this.fromAddress+this.toAddress+this.amount).toString();
    }
    signTransaction(signingKey){
        if (signingKey.getPublic('hex')!==this.fromAddress){
            throw new Error('You cannot sign transactions for other wallets!');
        }
        const hashTx=this.calculateHash();
        const sig=signingKey.sign(hashTx,'base64');
        this.signature=sig.toDER('hex');
    }

    isValid(){
        if (this.fromAddress===null)return true;
        if (!this.signature || this.signature.length===0){
            throw new Error('No signature in this transaction');
        }
        const publicKey=ec.keyFromPublic(this.fromAddress,'hex');
        return publicKey.verify(this.calculateHash(),this.signature);
    }
}
class Block{
    constructor(timestamp,transactions,previousHash=''){
        this.timestamp=timestamp;
        this.transactions=transactions;
        this.previousHash=previousHash;
        this.hash=this.calculateHash();
        this.nonce=0;
    }
    calculateHash(){
        return SHA256(this.previousHash+this.timestamp+JSON.stringify(this.transactions)+this.nonce).toString();
    }
    mineBlock(difficulty){
        while(this.hash.substring(0,difficulty)!==Array(difficulty+1).join("0")){
            this.nonce++;
            this.hash=this.calculateHash();
        }

    }

    hasValidTransactions(){
        for(const tx of this.transactions){
            if (!tx.isValid()){
                return false;
            }
        }
        return true;

    }
}

class Blockchain{
    constructor(){
        this.chain=[this.createGenesisBlock()];
        this.difficulty=2;
        this.pendingTransactions=[];
        this.miningReward=100
    }
    createGenesisBlock(){
        return new Block("21/06/2025","Genesis Block","0");
    }
    getLatestBlock(){
        return this.chain[this.chain.length-1];

    }
    minePendingTransactions(miningRewardAddress){
        let block=new Block(Date.now(),this.pendingTransactions,this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);
        console.log('Block succesfully mined!');
        this.chain.push(block);
        this.pendingTransactions=[
            new Transactions(null,miningRewardAddress,this.miningReward)
        ];
        

    }
    addTransaction(transaction){
        if (!transaction.fromAddress || !transaction.toAddress){
            throw new Error('Transaction must include from and to address');
        }

        if (!transaction.isValid()){
            throw new Error('Cannot add invalid transaction to chain');
        }
        this.pendingTransactions.push(transaction);
    }
    getBalanceOfAddress(address){
        let balance=0;
        for (const block of this.chain){
            for(const trans of block.transactions){
                if (trans.fromAddress===address){
                    balance-=trans.amount;
                }
                if (trans.toAddress===address){
                    balance+=trans.amount;
                }
                    
                
            }
        }
        return balance;
    }
    isChainValid(){
        for (let i=1;i<this.chain.length;i++){
            const currentBlock=this.chain[i];
            const previousBlock=this.chain[i-1];

            if (!currentBlock.hasValidTransactions()){
                return false;
            }

            if (currentBlock.hash!==currentBlock.calculateHash()){
                return false;
            }
            if (currentBlock.previousHash!==previousBlock.hash){
                return false;
            }
        }
        return true;
    }

    loadChain(data) {
  this.chain = data.chain.map(blockData => {
    const block = new Block(
      blockData.timestamp,
      blockData.transactions,
      blockData.previousHash
    );
    block.hash = blockData.hash;
    block.nonce = blockData.nonce;
    return block;
  });
  this.difficulty = data.difficulty;
  this.pendingTransactions = data.pendingTransactions;
  this.miningReward = data.miningReward;
}




}
module.exports = {
  Blockchain,
  Transactions
};


    

