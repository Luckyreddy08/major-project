const SHA256 = require("crypto-js/sha256");

class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return SHA256(
      this.index +
      this.timestamp +
      JSON.stringify(this.data) +
      this.previousHash
    ).toString();
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  // 🔹 Fixed Genesis Block (Important for Multi-Node)
  createGenesisBlock() {
    return new Block(
      0,
      1700000000000,
      { message: "Genesis Block" },
      "0"
    );
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
  }

  // 🔹 Validate a single new block
  isValidNewBlock(newBlock, previousBlock) {
    if (newBlock.index !== previousBlock.index + 1) {
      return false;
    }

    if (newBlock.previousHash !== previousBlock.hash) {
      return false;
    }

    if (newBlock.calculateHash() !== newBlock.hash) {
      return false;
    }

    return true;
  }

  // 🔹 Validate entire current chain
  isChainValid(chain = this.chain) {
    // Check Genesis block consistency
    if (JSON.stringify(chain[0]) !== JSON.stringify(this.createGenesisBlock())) {
      return false;
    }

    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];

      if (!this.isValidNewBlock(currentBlock, previousBlock)) {
        return false;
      }
    }

    return true;
  }
}

module.exports = { Block, Blockchain };