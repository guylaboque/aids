const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenC", function () {
  let TokenC;
  let tokenC;
  let deployer;
  let initialSupply;

  beforeEach(async function () {
    // Initialize the initial supply for TokenC (300k tokens with 18 decimals)
    initialSupply = ethers.parseEther("300000000"); // 300k tokens with 18 decimals

    // Get the ContractFactory and Signers here
    [deployer] = await ethers.getSigners();
    TokenC = await ethers.getContractFactory("tokenC");

    // Deploy tokenC contract
    tokenC = await TokenC.deploy();
    await tokenC.waitForDeployment();
  });

  // Test for name and symbol
  it("Should have the correct name and symbol", async function () {
    expect(await tokenC.name()).to.equal("tokenC");
    expect(await tokenC.symbol()).to.equal("TKC");
  });

  // Test initial supply and assignment to deployer
  it("Should assign the total supply to the deployer", async function () {
    const deployerBalance = await tokenC.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(initialSupply);
  });

  // Test ownership (Ownable)
  it("Should set the deployer as the owner", async function () {
    expect(await tokenC.owner()).to.equal(deployer.address);
  });
});