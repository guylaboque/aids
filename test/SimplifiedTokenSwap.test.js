const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimplifiedTokenSwap", function () {
  let aidsToken, aiToken, depinToken, tokenSwap;
  let deployer, user1, user2;

  beforeEach(async function () {
    // Get signers
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy AIDS, AI, and DEPIN tokens
    const AIDSToken = await ethers.getContractFactory("aidstoken");
    const AIToken = await ethers.getContractFactory("aitoken");
    const DEPINToken = await ethers.getContractFactory("depintoken");

    // Deploy each token
    aidsToken = await AIDSToken.deploy();
    await aidsToken.waitForDeployment();

    aiToken = await AIToken.deploy();
    await aiToken.waitForDeployment();

    depinToken = await DEPINToken.deploy();
    await depinToken.waitForDeployment();

    // Deploy the SimplifiedTokenSwap contract
    const TokenSwap = await ethers.getContractFactory("SimplifiedTokenSwap");
    tokenSwap = await TokenSwap.deploy(aidsToken.target, aiToken.target, depinToken.target);
    await tokenSwap.waitForDeployment();

    // Transfer some AIDS to the swap contract to facilitate exchanges
    await aidsToken.transfer(tokenSwap.target, ethers.parseEther("1000"));
  });

  it("Should have correct initial balances for the token swap contract", async function () {
    const contractBalanceAIDS = await aidsToken.balanceOf(tokenSwap.target);
    expect(contractBalanceAIDS).to.equal(ethers.parseEther("1000"));
  });

  it("Should allow user to swap AI and DEPIN for AIDS", async function () {
    // Transfer some AI and DEPIN to user1
    await aiToken.transfer(user1.address, ethers.parseEther("100"));
    await depinToken.transfer(user1.address, ethers.parseEther("100"));

    // Approve the swap contract to spend AI and DEPIN
    await aiToken.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));
    await depinToken.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));

    // Check user1 balances before the swap
    const user1InitialBalanceAIDS = await aidsToken.balanceOf(user1.address);
    const user1InitialBalanceAI = await aiToken.balanceOf(user1.address);
    const user1InitialBalanceDEPIN = await depinToken.balanceOf(user1.address);

    // Perform the swap
    await tokenSwap.connect(user1).swap(ethers.parseEther("100"));

    // Check user1 balances after the swap
    const user1FinalBalanceAIDS = await aidsToken.balanceOf(user1.address);
    const user1FinalBalanceAI = await aiToken.balanceOf(user1.address);
    const user1FinalBalanceDEPIN = await depinToken.balanceOf(user1.address);

    // Expect user to receive 100 AIDS and spend 100 AI and 100 DEPIN
    expect(user1FinalBalanceAIDS - user1InitialBalanceAIDS).to.equal(ethers.parseEther("100"));
    expect(user1InitialBalanceAI - user1FinalBalanceAI).to.equal(ethers.parseEther("100"));
    expect(user1InitialBalanceDEPIN - user1FinalBalanceDEPIN).to.equal(ethers.parseEther("100"));

    // Check contract balances after the swap
    const contractBalanceAIDS = await aidsToken.balanceOf(tokenSwap.target);
    const contractBalanceAI = await aiToken.balanceOf(tokenSwap.target);
    const contractBalanceDEPIN = await depinToken.balanceOf(tokenSwap.target);

    // Expect contract to have 900 AIDS and 100 each of AI and DEPIN
    expect(contractBalanceAIDS).to.equal(ethers.parseEther("900"));
    expect(contractBalanceAI).to.equal(ethers.parseEther("100"));
    expect(contractBalanceDEPIN).to.equal(ethers.parseEther("100"));
  });

  it("Should revert if the user does not have enough allowance", async function () {
    // Transfer some AI and DEPIN to user1
    await aiToken.transfer(user1.address, ethers.parseEther("100"));
    await depinToken.transfer(user1.address, ethers.parseEther("100"));

    // Approve the swap contract to spend only 50 AI (not enough)
    await aiToken.connect(user1).approve(tokenSwap.target, ethers.parseEther("50"));
    await depinToken.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));

    // Attempt the swap, should fail due to insufficient allowance of AI
    await expect(tokenSwap.connect(user1).swap(ethers.parseEther("100"))).to.be.revertedWith("AI: Insufficient allowance");
  });

  it("Should revert if the contract does not have enough AIDS for the swap", async function () {
    // Transfer some AI and DEPIN to user1
    await aiToken.transfer(user1.address, ethers.parseEther("2000"));
    await depinToken.transfer(user1.address, ethers.parseEther("2000"));

    // Approve the swap contract to spend AI and DEPIN
    await aiToken.connect(user1).approve(tokenSwap.target, ethers.parseEther("2000"));
    await depinToken.connect(user1).approve(tokenSwap.target, ethers.parseEther("2000"));

    // Attempt to swap more AIDS than the contract has (contract only has 1000 AIDS)
    await expect(tokenSwap.connect(user1).swap(ethers.parseEther("1500"))).to.be.revertedWith("AIDS: Insufficient balance in contract");
  });

  it("Should allow the owner to emergency withdraw tokens", async function () {
    // Fund contract with AI and DEPIN
    await aiToken.transfer(tokenSwap.target, ethers.parseEther("500"));
    await depinToken.transfer(tokenSwap.target, ethers.parseEther("500"));

    // Check initial balances
    const initialOwnerBalanceAIDS = await aidsToken.balanceOf(deployer.address);
    const initialOwnerBalanceAI = await aiToken.balanceOf(deployer.address);
    const initialOwnerBalanceDEPIN = await depinToken.balanceOf(deployer.address);

    // Owner performs emergency withdrawal of AIDS, AI, and DEPIN
    await tokenSwap.emergencyWithdraw(aidsToken.target, ethers.parseEther("100"));
    await tokenSwap.emergencyWithdraw(aiToken.target, ethers.parseEther("50"));
    await tokenSwap.emergencyWithdraw(depinToken.target, ethers.parseEther("50"));

    // Check final balances
    const finalOwnerBalanceAIDS = await aidsToken.balanceOf(deployer.address);
    const finalOwnerBalanceAI = await aiToken.balanceOf(deployer.address);
    const finalOwnerBalanceDEPIN = await depinToken.balanceOf(deployer.address);

    // Expect owner to receive the withdrawn tokens
    expect(finalOwnerBalanceAIDS - initialOwnerBalanceAIDS).to.equal(ethers.parseEther("100"));
    expect(finalOwnerBalanceAI - initialOwnerBalanceAI).to.equal(ethers.parseEther("50"));
    expect(finalOwnerBalanceDEPIN - initialOwnerBalanceDEPIN).to.equal(ethers.parseEther("50"));
  });
});