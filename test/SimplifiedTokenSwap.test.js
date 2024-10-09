const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimplifiedTokenSwap", function () {
  let tokenA, tokenB, tokenC, tokenSwap;
  let deployer, user1, user2;

  beforeEach(async function () {
    // Get signers
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy tokenA, tokenB, and tokenC contracts
    const TokenA = await ethers.getContractFactory("tokenA");
    const TokenB = await ethers.getContractFactory("tokenB");
    const TokenC = await ethers.getContractFactory("tokenC");

    // Deploy each token
    tokenA = await TokenA.deploy();
    await tokenA.waitForDeployment();

    tokenB = await TokenB.deploy();
    await tokenB.waitForDeployment();

    tokenC = await TokenC.deploy();
    await tokenC.waitForDeployment();

    // Deploy the SimplifiedTokenSwap contract
    const TokenSwap = await ethers.getContractFactory("SimplifiedTokenSwap");
    tokenSwap = await TokenSwap.deploy(tokenA.target, tokenB.target, tokenC.target);
    await tokenSwap.waitForDeployment();

    // Transfer some TokenA to the swap contract to facilitate exchanges
    await tokenA.transfer(tokenSwap.target, ethers.parseEther("1000"));
  });

  it("Should have correct initial balances for the token swap contract", async function () {
    const contractBalanceA = await tokenA.balanceOf(tokenSwap.target);
    expect(contractBalanceA).to.equal(ethers.parseEther("1000"));
  });

  it("Should allow user to swap TokenB and TokenC for TokenA", async function () {
    // Transfer some TokenB and TokenC to user1
    await tokenB.transfer(user1.address, ethers.parseEther("100"));
    await tokenC.transfer(user1.address, ethers.parseEther("100"));

    // Approve the swap contract to spend TokenB and TokenC
    await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));
    await tokenC.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));

    // Check user1 balances before the swap
    const user1InitialBalanceA = await tokenA.balanceOf(user1.address);
    const user1InitialBalanceB = await tokenB.balanceOf(user1.address);
    const user1InitialBalanceC = await tokenC.balanceOf(user1.address);

    // Perform the swap
    await tokenSwap.connect(user1).swap(ethers.parseEther("100"));

    // Check user1 balances after the swap
    const user1FinalBalanceA = await tokenA.balanceOf(user1.address);
    const user1FinalBalanceB = await tokenB.balanceOf(user1.address);
    const user1FinalBalanceC = await tokenC.balanceOf(user1.address);

    // Expect user to receive 100 TokenA and spend 100 TokenB and 100 TokenC
    expect(user1FinalBalanceA-user1InitialBalanceA).to.equal(ethers.parseEther("100"));
    expect(user1InitialBalanceB-user1FinalBalanceB).to.equal(ethers.parseEther("100"));
    expect(user1InitialBalanceC-user1FinalBalanceC).to.equal(ethers.parseEther("100"));

    // Check contract balances after the swap
    const contractBalanceA = await tokenA.balanceOf(tokenSwap.target);
    const contractBalanceB = await tokenB.balanceOf(tokenSwap.target);
    const contractBalanceC = await tokenC.balanceOf(tokenSwap.target);

    // Expect contract to have 900 TokenA and 100 each of TokenB and TokenC
    expect(contractBalanceA).to.equal(ethers.parseEther("900"));
    expect(contractBalanceB).to.equal(ethers.parseEther("100"));
    expect(contractBalanceC).to.equal(ethers.parseEther("100"));
  });

  it("Should revert if the user does not have enough allowance", async function () {
    // Transfer some TokenB and TokenC to user1
    await tokenB.transfer(user1.address, ethers.parseEther("100"));
    await tokenC.transfer(user1.address, ethers.parseEther("100"));

    // Approve the swap contract to spend only 50 TokenB (not enough)
    await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("50"));
    await tokenC.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));

    // Attempt the swap, should fail due to insufficient allowance of TokenB
    await expect(tokenSwap.connect(user1).swap(ethers.parseEther("100"))).to.be.revertedWith("TokenB: Insufficient allowance");
  });

  it("Should revert if the contract does not have enough TokenA for the swap", async function () {
    // Transfer some TokenB and TokenC to user1
    await tokenB.transfer(user1.address, ethers.parseEther("2000"));
    await tokenC.transfer(user1.address, ethers.parseEther("2000"));

    // Approve the swap contract to spend TokenB and TokenC
    await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("2000"));
    await tokenC.connect(user1).approve(tokenSwap.target, ethers.parseEther("2000"));

    // Attempt to swap more TokenA than the contract has (contract only has 1000 TokenA)
    await expect(tokenSwap.connect(user1).swap(ethers.parseEther("1500"))).to.be.revertedWith("TokenA: Insufficient balance in contract");
  });

  it("Should allow the owner to emergency withdraw tokens", async function () {
    // Fund contract with tokenB and tokenC
    await tokenB.transfer(tokenSwap.target, ethers.parseEther("500"));
    await tokenC.transfer(tokenSwap.target, ethers.parseEther("500"));

    // Check initial balances
    const initialOwnerBalanceA = await tokenA.balanceOf(deployer.address);
    const initialOwnerBalanceB = await tokenB.balanceOf(deployer.address);
    const initialOwnerBalanceC = await tokenC.balanceOf(deployer.address);

    // Owner performs emergency withdrawal of TokenA, TokenB, and TokenC
    await tokenSwap.emergencyWithdraw(tokenA.target, ethers.parseEther("100"));
    await tokenSwap.emergencyWithdraw(tokenB.target, ethers.parseEther("50"));
    await tokenSwap.emergencyWithdraw(tokenC.target, ethers.parseEther("50"));

    // Check final balances
    const finalOwnerBalanceA = await tokenA.balanceOf(deployer.address);
    const finalOwnerBalanceB = await tokenB.balanceOf(deployer.address);
    const finalOwnerBalanceC = await tokenC.balanceOf(deployer.address);

    // Expect owner to receive the withdrawn tokens
    expect(finalOwnerBalanceA-initialOwnerBalanceA).to.equal(ethers.parseEther("100"));
    expect(finalOwnerBalanceB-initialOwnerBalanceB).to.equal(ethers.parseEther("50"));
    expect(finalOwnerBalanceC-initialOwnerBalanceC).to.equal(ethers.parseEther("50"));
  });
});