const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenA", function () {
  let TokenA;
  let tokenA;
  let deployer;
  let initialSupply;

  beforeEach(async function () {
    // Initialize the initial supply inside the beforeEach block
    initialSupply = ethers.parseEther("1000000000"); // 1 billion tokens with 18 decimals

    // Get the ContractFactory and Signers here
    [deployer] = await ethers.getSigners();
    TokenA = await ethers.getContractFactory("tokenA");

    // Deploy tokenA contract
    tokenA = await TokenA.deploy();
    await tokenA.waitForDeployment();
  });

  // Test for name and symbol
  it("Should have the correct name and symbol", async function () {
    expect(await tokenA.name()).to.equal("tokenA");
    expect(await tokenA.symbol()).to.equal("TKA");
  });

  // Test initial supply and assignment to deployer
  it("Should assign the total supply to the deployer", async function () {
    const deployerBalance = await tokenA.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(initialSupply);
  });

  // Test ownership (Ownable)
  it("Should set the deployer as the owner", async function () {
    expect(await tokenA.owner()).to.equal(deployer.address);
  });
});