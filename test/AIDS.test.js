const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AIDSToken", function () {
  let AIDSToken;
  let aidsToken;
  let deployer;
  let initialSupply;

  beforeEach(async function () {
    // Initialize the initial supply for AIDSToken (1 billion tokens with 18 decimals)
    initialSupply = ethers.parseEther("1000000000"); // 1 billion tokens with 18 decimals

    // Get the ContractFactory and Signers here
    [deployer] = await ethers.getSigners();
    AIDSToken = await ethers.getContractFactory("aidstoken");

    // Deploy aidsToken contract
    aidsToken = await AIDSToken.deploy();
    await aidsToken.waitForDeployment();
  });

  // Test for name and symbol
  it("Should have the correct name and symbol", async function () {
    expect(await aidsToken.name()).to.equal("aidepinsupertoken");
    expect(await aidsToken.symbol()).to.equal("AIDS");
  });

  // Test initial supply and assignment to deployer
  it("Should assign the total supply to the deployer", async function () {
    const deployerBalance = await aidsToken.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(initialSupply);
  });

  // Test ownership (Ownable)
  it("Should set the deployer as the owner", async function () {
    expect(await aidsToken.owner()).to.equal(deployer.address);
  });
});