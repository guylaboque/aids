const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AIToken", function () {
  let AIToken;
  let aiToken;
  let deployer;
  let initialSupply;

  beforeEach(async function () {
    // Initialize the initial supply for AIToken (300 million tokens with 18 decimals)
    initialSupply = ethers.parseEther("300000000"); // 300 million tokens with 18 decimals

    // Get the ContractFactory and Signers here
    [deployer] = await ethers.getSigners();
    AIToken = await ethers.getContractFactory("aitoken");

    // Deploy aiToken contract
    aiToken = await AIToken.deploy();
    await aiToken.waitForDeployment();
  });

  // Test for name and symbol
  it("Should have the correct name and symbol", async function () {
    expect(await aiToken.name()).to.equal("assinu");
    expect(await aiToken.symbol()).to.equal("AI");
  });

  // Test initial supply and assignment to deployer
  it("Should assign the total supply to the deployer", async function () {
    const deployerBalance = await aiToken.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(initialSupply);
  });

  // Test ownership (Ownable)
  it("Should set the deployer as the owner", async function () {
    expect(await aiToken.owner()).to.equal(deployer.address);
  });
});