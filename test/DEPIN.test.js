const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepinToken", function () {
  let DepinToken;
  let depinToken;
  let deployer;
  let initialSupply;

  beforeEach(async function () {
    // Initialize the initial supply for DepinToken (300 million tokens with 18 decimals)
    initialSupply = ethers.parseEther("300000000"); // 300 million tokens with 18 decimals

    // Get the ContractFactory and Signers here
    [deployer] = await ethers.getSigners();
    DepinToken = await ethers.getContractFactory("depintoken");

    // Deploy depinToken contract
    depinToken = await DepinToken.deploy();
    await depinToken.waitForDeployment();
  });

  // Test for name and symbol
  it("Should have the correct name and symbol", async function () {
    expect(await depinToken.name()).to.equal("degenpumpinfinitynarwhal");
    expect(await depinToken.symbol()).to.equal("DEPIN");
  });

  // Test initial supply and assignment to deployer
  it("Should assign the total supply to the deployer", async function () {
    const deployerBalance = await depinToken.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(initialSupply);
  });

  // Test ownership (Ownable)
  it("Should set the deployer as the owner", async function () {
    expect(await depinToken.owner()).to.equal(deployer.address);
  });
});