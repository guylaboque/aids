const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenB", function () {
  let TokenB;
  let tokenB;
  let deployer;
  let initialSupply;

  beforeEach(async function () {
    // Initialize the initial supply for TokenB (300k tokens with 18 decimals)
    initialSupply = ethers.parseEther("300000000"); // 300k tokens with 18 decimals

    // Get the ContractFactory and Signers here
    [deployer] = await ethers.getSigners();
    TokenB = await ethers.getContractFactory("tokenB");

    // Deploy tokenB contract
    tokenB = await TokenB.deploy();
    await tokenB.waitForDeployment();
  });

  // Test for name and symbol
  it("Should have the correct name and symbol", async function () {
    expect(await tokenB.name()).to.equal("tokenB");
    expect(await tokenB.symbol()).to.equal("TKB");
  });

  // Test initial supply and assignment to deployer
  it("Should assign the total supply to the deployer", async function () {
    const deployerBalance = await tokenB.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(initialSupply);
  });

  // Test ownership (Ownable)
  it("Should set the deployer as the owner", async function () {
    expect(await tokenB.owner()).to.equal(deployer.address);
  });
});