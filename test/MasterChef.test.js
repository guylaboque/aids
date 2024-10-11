const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterChef", function () {
  let AIToken, AIDSToken, DEPINToken, MasterChef;
  let aiToken, aidsToken, depinToken, masterChef;
  let deployer, user1, user2;
  let rewardPerBlock = ethers.parseEther("10"); // Reward per block for AI
  let startBlock;
  let startDelay = 10;
  let blocksPassed;

  beforeEach(async function () {
    let blocksPassedBefore = 0;
    [deployer, user1, user2] = await ethers.getSigners();

    AIToken = await ethers.getContractFactory("aitoken");
    aiToken = await AIToken.deploy();
    await aiToken.waitForDeployment();

    AIDSToken = await ethers.getContractFactory("aidstoken");
    aidsToken = await AIDSToken.deploy();
    await aidsToken.waitForDeployment();

    DEPINToken = await ethers.getContractFactory("depintoken");
    depinToken = await DEPINToken.deploy();
    await depinToken.waitForDeployment();

    startBlock = await ethers.provider.getBlockNumber() + startDelay;
    MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.deploy(aiToken.target, startBlock, rewardPerBlock);
    blocksPassedBefore += 1;
    await masterChef.waitForDeployment();

    await aiToken.transfer(masterChef.target, ethers.parseEther("1000000"));
    blocksPassedBefore += 1;

    await masterChef.addPool(aidsToken.target, 1000, 0);
    blocksPassedBefore += 1;
    blocksPassed = blocksPassedBefore;
  });

  it("Should have the correct rewardPerBlock and startBlock", async function () {
    expect(await masterChef.rewardPerBlock()).to.equal(rewardPerBlock);
    expect(await masterChef.startBlock()).to.equal(startBlock);
  });

  it("Should allow user to deposit tokens and earn rewards", async function () {
    const depositAmount = ethers.parseEther("100");
    await aidsToken.transfer(user1.address, depositAmount);
    await aidsToken.connect(user1).approve(masterChef.target, depositAmount);

    await masterChef.connect(user1).deposit(0, depositAmount);

    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    let pendingReward = await masterChef.pendingRewards(0, user1.address);
    expect(pendingReward).to.be.gt(0);

    await masterChef.connect(user1).withdraw(0, depositAmount);
    let user1RewardBalance = await aiToken.balanceOf(user1.address);
    expect(user1RewardBalance).to.be.gt(0);
  });

  it("Should allow user to withdraw staked tokens and rewards", async function () {
    const depositAmount = ethers.parseEther("100");
    await aidsToken.transfer(user1.address, depositAmount);
    await aidsToken.connect(user1).approve(masterChef.target, depositAmount);
    await masterChef.connect(user1).deposit(0, depositAmount);

    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    await masterChef.connect(user1).withdraw(0, depositAmount);

    let user1Balance = await aidsToken.balanceOf(user1.address);
    expect(user1Balance).to.equal(depositAmount);

    let user1RewardBalance = await aiToken.balanceOf(user1.address);
    expect(user1RewardBalance).to.be.gt(0);
  });

  it("Timelock should work correctly for withdrawals", async function () {
    await masterChef.addPool(depinToken.target, 1000, 1000);

    const depositAmount1 = ethers.parseEther("50");
    await depinToken.transfer(user1.address, depositAmount1);
    await depinToken.connect(user1).approve(masterChef.target, depositAmount1);
    await masterChef.connect(user1).deposit(1, depositAmount1);

    await expect(masterChef.connect(user1).withdraw(1, depositAmount1))
      .to.be.revertedWith("Withdraw: amount exceeds withdrawable");

    await ethers.provider.send("evm_increaseTime", [900]);
    await ethers.provider.send("evm_mine", []);

    const depositAmount2 = ethers.parseEther("50");
    await depinToken.transfer(user1.address, depositAmount2);
    await depinToken.connect(user1).approve(masterChef.target, depositAmount2);
    await masterChef.connect(user1).deposit(1, depositAmount2);

    await expect(masterChef.connect(user1).withdraw(1, depositAmount1))
      .to.be.revertedWith("Withdraw: amount exceeds withdrawable");

    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    await masterChef.connect(user1).withdraw(1, depositAmount1);

    let user1Balance = await depinToken.balanceOf(user1.address);
    expect(user1Balance).to.equal(depositAmount1);

    let withdrawableBalance = await masterChef.withdrawableBalance(1, user1.address);
    expect(withdrawableBalance).to.equal(0n);

    await ethers.provider.send("evm_increaseTime", [900]);
    await ethers.provider.send("evm_mine", []);

    await masterChef.connect(user1).withdraw(1, depositAmount2);

    user1Balance = await depinToken.balanceOf(user1.address);
    expect(user1Balance).to.equal(depositAmount1 + depositAmount2);
  });

  it("Should distribute rewards based on allocation points", async function () {
    await masterChef.addPool(depinToken.target, 500, 0);
    blocksPassed += 1;

    const totalAllocPoint = await masterChef.totalAllocPoint();
    expect(totalAllocPoint).to.equal(1500);

    const depositAmount = ethers.parseEther("100");
    await aidsToken.transfer(user1.address, depositAmount);
    blocksPassed += 1;
    await aidsToken.connect(user1).approve(masterChef.target, depositAmount);
    await masterChef.connect(user1).deposit(0, depositAmount);
    blocksPassed += 1;

    for (let i = 0; i < 1000; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    blocksPassed += 1000;

    let pendingReward = await masterChef.pendingRewards(0, user1.address);
    blocksPassed += 1;

    let rewardPerBlock = ethers.parseEther("10");
    let currentBlock = await ethers.provider.getBlockNumber();
    let actualBlocksPassed = currentBlock - startBlock;

    // Adjust the expected reward calculation to use actualBlocksPassed
    let expectedReward = (rewardPerBlock * 1000n * BigInt(actualBlocksPassed)) / 1500n;

    let tolerance = ethers.parseEther("0.00001"); // Keep the increased tolerance for safety

    let diff = pendingReward - expectedReward;
    let percentageDiff = (Number(diff) / Number(expectedReward)) * 100;

    console.log("Pending Reward:", pendingReward.toString());
    console.log("Expected Reward:", expectedReward.toString());
    console.log("Difference:", diff.toString());
    console.log("Percentage Difference: " + percentageDiff.toFixed(6) + "%");
    console.log("Tolerance:", tolerance.toString());
    console.log("Expected blocks passed:", blocksPassed - startDelay);
    console.log("Actual blocks passed:", actualBlocksPassed);

    expect(diff <= tolerance && diff >= -tolerance, 
      `Difference (${diff}) exceeds tolerance (${tolerance})`
    ).to.be.true;
  });

  it("Should correctly report TVL for a single pool", async function () {
    const depositAmount = ethers.parseEther("100");
    await aidsToken.transfer(user1.address, depositAmount);
    await aidsToken.connect(user1).approve(masterChef.target, depositAmount);
    await masterChef.connect(user1).deposit(0, depositAmount);

    const tvl = await masterChef.getPoolTVL(0);
    expect(tvl).to.equal(depositAmount);

    await aidsToken.transfer(user2.address, depositAmount);
    await aidsToken.connect(user2).approve(masterChef.target, depositAmount);
    await masterChef.connect(user2).deposit(0, depositAmount);

    const updatedTvl = await masterChef.getPoolTVL(0);
    expect(updatedTvl).to.equal(depositAmount * 2n);
  });

  it("Should correctly report TVL for all pools", async function () {
    await masterChef.addPool(depinToken.target, 500, 0);

    const depositAmount1 = ethers.parseEther("100");
    const depositAmount2 = ethers.parseEther("200");

    await aidsToken.transfer(user1.address, depositAmount1);
    await aidsToken.connect(user1).approve(masterChef.target, depositAmount1);
    await masterChef.connect(user1).deposit(0, depositAmount1);

    await depinToken.transfer(user2.address, depositAmount2);
    await depinToken.connect(user2).approve(masterChef.target, depositAmount2);
    await masterChef.connect(user2).deposit(1, depositAmount2);

    const allTvls = await masterChef.getAllPoolsTVL();
    expect(allTvls.length).to.equal(2);
    expect(allTvls[0]).to.equal(depositAmount1);
    expect(allTvls[1]).to.equal(depositAmount2);
  });

  it("Should update TVL correctly after withdrawals", async function () {
    const depositAmount = ethers.parseEther("100");
    await aidsToken.transfer(user1.address, depositAmount);
    await aidsToken.connect(user1).approve(masterChef.target, depositAmount);
    await masterChef.connect(user1).deposit(0, depositAmount);

    const initialTvl = await masterChef.getPoolTVL(0);
    expect(initialTvl).to.equal(depositAmount);

    const withdrawAmount = ethers.parseEther("40");
    await masterChef.connect(user1).withdraw(0, withdrawAmount);

    const updatedTvl = await masterChef.getPoolTVL(0);
    expect(updatedTvl).to.equal(depositAmount - withdrawAmount);
  });

  it("Should correctly report the total deposit for a user", async function () {
    const depositAmount1 = ethers.parseEther("50");
    const depositAmount2 = ethers.parseEther("30");
    
    // Transfer AIDS tokens to user1 and approve the MasterChef contract
    await aidsToken.transfer(user1.address, depositAmount1 + depositAmount2);
    await aidsToken.connect(user1).approve(masterChef.target, depositAmount1 + depositAmount2);
  
    // User1 makes the first deposit
    await masterChef.connect(user1).deposit(0, depositAmount1);
    
    // Check the total deposit after the first deposit
    let totalDeposit = await masterChef.getUserTotalDeposit(0, user1.address);
    expect(totalDeposit).to.equal(depositAmount1);
  
    // User1 makes a second deposit
    await masterChef.connect(user1).deposit(0, depositAmount2);
  
    // Check the total deposit after the second deposit
    totalDeposit = await masterChef.getUserTotalDeposit(0, user1.address);
    expect(totalDeposit).to.equal(depositAmount1 + depositAmount2);
  
    // Perform a partial withdrawal
    const withdrawAmount = ethers.parseEther("20");
    await masterChef.connect(user1).withdraw(0, withdrawAmount);
  
    // Check the total deposit after the withdrawal
    totalDeposit = await masterChef.getUserTotalDeposit(0, user1.address);
    expect(totalDeposit).to.equal(depositAmount1 + depositAmount2 - withdrawAmount);
  });
});