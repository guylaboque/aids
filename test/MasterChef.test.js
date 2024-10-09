const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterChefA", function () {
  let TokenA, TokenB, MasterChefA;
  let tokenA, tokenB, masterChefA;
  let deployer, user1, user2;
  let rewardPerBlock = ethers.parseEther("10"); // Reward per block for TokenA
  let startBlock;
  let startDelay = 10; 
  let blocksPassed;

  beforeEach(async function () {
    let blocksPassedBefore = 0; 
    // Get signers (deployer and users)
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy tokenA and tokenB contracts (used as staking and reward tokens)
    TokenA = await ethers.getContractFactory("tokenA");
    tokenA = await TokenA.deploy();
    await tokenA.waitForDeployment();

    TokenB = await ethers.getContractFactory("tokenB");
    tokenB = await TokenB.deploy();
    await tokenB.waitForDeployment();

    // Define the start block and deploy the MasterChefA contract
    startBlock = await ethers.provider.getBlockNumber() + startDelay; // Start 10 blocks later
    MasterChefA = await ethers.getContractFactory("MasterChefA");
    masterChefA = await MasterChefA.deploy(tokenA.target, startBlock, rewardPerBlock);
    blocksPassedBefore +=1;
    await masterChefA.waitForDeployment();

    // Transfer some reward tokens to the MasterChef contract to distribute as rewards
    await tokenA.transfer(masterChefA.target, ethers.parseEther("1000000"));
    blocksPassedBefore +=1;

    // Add a staking pool with tokenB (staking token)
    await masterChefA.addPool(tokenB.target, 1000, 0); // 0 lockup period for easy testing
    blocksPassedBefore +=1;
    blocksPassed = blocksPassedBefore;
  });

  it("Should have the correct rewardPerBlock and startBlock", async function () {
    expect(await masterChefA.rewardPerBlock()).to.equal(rewardPerBlock);
    expect(await masterChefA.startBlock()).to.equal(startBlock);
  });

  it("Should allow user to deposit tokens and earn rewards", async function () {
    // User1 deposits 100 tokens
    const depositAmount = ethers.parseEther("100");
    await tokenB.transfer(user1.address, depositAmount);
    await tokenB.connect(user1).approve(masterChefA.target, depositAmount);

    await masterChefA.connect(user1).deposit(0, depositAmount);

    // Move forward 10 blocks to start rewards
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Check pending rewards for user1
    let pendingReward = await masterChefA.pendingRewards(0, user1.address);
    expect(pendingReward).to.be.gt(0); // User should have some pending rewards

    // User1 harvests the rewards
    await masterChefA.connect(user1).withdraw(0, depositAmount);
    let user1RewardBalance = await tokenA.balanceOf(user1.address);
    expect(user1RewardBalance).to.be.gt(0); // User should have received the rewards
  });

  it("Should allow user to withdraw staked tokens and rewards", async function () {
    // User1 deposits 100 tokens
    const depositAmount = ethers.parseEther("100");
    await tokenB.transfer(user1.address, depositAmount);
    await tokenB.connect(user1).approve(masterChefA.target, depositAmount);
    await masterChefA.connect(user1).deposit(0, depositAmount);

    // Move forward 10 blocks to accumulate rewards
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Withdraw the tokens and claim rewards
    await masterChefA.connect(user1).withdraw(0, depositAmount);

    // Check user1 balance after withdrawal
    let user1Balance = await tokenB.balanceOf(user1.address);
    expect(user1Balance).to.equal(depositAmount); // User1 should get back their deposit

    let user1RewardBalance = await tokenA.balanceOf(user1.address);
    expect(user1RewardBalance).to.be.gt(0); // User1 should have some rewards
  });

  it("Timelock should work correctly for withdrawals", async function () {
    // Set up a pool with a 10 second lockup period
    await masterChefA.addPool(tokenB.target, 1000, 1000); // 10 second lockup period
  
    // User1 deposits 50 tokens (first deposit)
    const depositAmount1 = ethers.parseEther("50");
    await tokenB.transfer(user1.address, depositAmount1);
    await tokenB.connect(user1).approve(masterChefA.target, depositAmount1);
    await masterChefA.connect(user1).deposit(1, depositAmount1);
  
    // Check that withdraw fails before the timelock expires
    await expect(masterChefA.connect(user1).withdraw(1, depositAmount1))
      .to.be.revertedWith("Withdraw: amount exceeds withdrawable");
  
    // Move forward 900 seconds (timelock not yet expired)
    await ethers.provider.send("evm_increaseTime", [900]);
    await ethers.provider.send("evm_mine", []);

    // User1 deposits another 50 tokens (second deposit)
    const depositAmount2 = ethers.parseEther("50");
    await tokenB.transfer(user1.address, depositAmount2);
    await tokenB.connect(user1).approve(masterChefA.target, depositAmount2);
    await masterChefA.connect(user1).deposit(1, depositAmount2);
  
    // Check again that withdraw still fails
    await expect(masterChefA.connect(user1).withdraw(1, depositAmount1))
      .to.be.revertedWith("Withdraw: amount exceeds withdrawable");
  
    // Fast forward 100 more second (timelock should expire for the first deposit)
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
  
    // Now the first deposit should be withdrawable
    await masterChefA.connect(user1).withdraw(1, depositAmount1);
  
    // Check if only the first deposit was withdrawn and the second deposit is still locked
    let user1Balance = await tokenB.balanceOf(user1.address);
    expect(user1Balance).to.equal(depositAmount1); // Only the first deposit is returned
  
    // Check the withdrawable balance for the second deposit (it should still be 0)
    let withdrawableBalance = await masterChefA.withdrawableBalance(1, user1.address);
    expect(withdrawableBalance).to.equal(0); // Second deposit is still locked
  
    // Fast forward another 900 seconds to unlock the second deposit
    await ethers.provider.send("evm_increaseTime", [900]);
    await ethers.provider.send("evm_mine", []);
  
    // Now the second deposit should be withdrawable
    await masterChefA.connect(user1).withdraw(1, depositAmount2);
  
    // Check if the second deposit is withdrawn
    user1Balance = await tokenB.balanceOf(user1.address);
    expect(user1Balance).to.equal(depositAmount1+depositAmount2); // Both deposits are returned
  });

  it("Should distribute rewards based on allocation points", async function () {
    // Add a second pool with a different allocation point
    await masterChefA.addPool(tokenB.target, 500, 0); // 500 allocation points
    blocksPassed +=1;

    const totalAllocPoint = await masterChefA.totalAllocPoint();
    expect(totalAllocPoint).to.equal(1500); // Now total allocation points should be 1500

    // User1 deposits 100 tokens into the first pool
    const depositAmount = ethers.parseEther("100");
    await tokenB.transfer(user1.address, depositAmount);
    blocksPassed +=1;
    await tokenB.connect(user1).approve(masterChefA.target, depositAmount);
    await masterChefA.connect(user1).deposit(0, depositAmount); // Deposit into the first pool
    blocksPassed +=1;

    // Move forward 1000 blocks to accumulate rewards
    for (let i = 0; i < 1000; i++) {
      await ethers.provider.send("evm_mine", []); // Manually mine 1000 blocks
    }
    blocksPassed +=1;

    // Log the current block to verify
    let currentBlock = await ethers.provider.getBlockNumber();
    console.log("Current Block:", currentBlock);  // This logs the current block number

    // Check pending rewards for user1 in pool 0
    let pendingReward = await masterChefA.pendingRewards(0, user1.address);

    // Since the first pool has 1000 allocation points and total is 1500,
    // this pool gets (1000 / 1500) * 10 TokenA rewards per block.
    let rewardPerBlock = BigInt(ethers.parseEther("10").toString()); // 10 TokenA in wei
    expect(blocksPassed).to.equal(7);
    let expectedReward = (rewardPerBlock * BigInt(1000) / BigInt(1500)) * BigInt(1000-10+blocksPassed); 

    // Set a tolerance value (e.g., allow for a small difference, like 1e12 wei)
    let tolerance = BigInt(1e12); // This represents 0.000001 TokenA (1e-6 tokens)

    // Check that the difference between pendingReward and expectedReward is within tolerance
    let diff = pendingReward - expectedReward;
    expect(diff <= tolerance && diff >= -tolerance).to.be.true;

    // User1 harvests the rewards
    await masterChefA.connect(user1).harvest(0);
    blocksPassed +=1;
    let expectedRewardHarvest = (rewardPerBlock * BigInt(1000) / BigInt(1500)) * BigInt(1000-10+blocksPassed); 
    let user1RewardBalance = await tokenA.balanceOf(user1.address);

    // Define a small tolerance for rounding/precision errors
    let toleranceHarvest = BigInt(1e12); // This represents 0.000001 TokenA (1e-6 tokens)

    // Calculate the difference between the actual and expected rewards
    let diffHarvest = BigInt(user1RewardBalance.toString()) - BigInt(expectedRewardHarvest.toString());

    // Check that the difference is within the tolerance
    expect(diff <= toleranceHarvest && diffHarvest >= -tolerance).to.be.true;  // Allow for some inaccuracy due to rounding
  });
});