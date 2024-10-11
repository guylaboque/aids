const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", await deployer.getAddress());

  // Deploy aitoken
  const AIToken = await hre.ethers.getContractFactory("aitoken");
  const aitoken = await AIToken.deploy();
  await aitoken.waitForDeployment();
  console.log("aitoken deployed to:", await aitoken.getAddress());

  // Get the total supply of aitoken
  const totalSupply = await aitoken.totalSupply();
  const halfSupply = totalSupply / 2n;
  console.log("Half of AI token supply:", hre.ethers.formatEther(halfSupply));

  // Deploy aidstoken
  const AIDSToken = await hre.ethers.getContractFactory("aidstoken");
  const aidstoken = await AIDSToken.deploy();
  await aidstoken.waitForDeployment();
  console.log("aidstoken deployed to:", await aidstoken.getAddress());

  // Deploy depintoken
  const DEPINToken = await hre.ethers.getContractFactory("depintoken");
  const depintoken = await DEPINToken.deploy();
  await depintoken.waitForDeployment();
  console.log("depintoken deployed to:", await depintoken.getAddress());

  // Deploy MasterChef
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const startBlock = BigInt(currentBlock) + 10n; // 10 blocks from now
  const rewardPerBlock = hre.ethers.parseEther("10"); // 10 tokens per block

  const MasterChef = await hre.ethers.getContractFactory("MasterChef");
  const masterChef = await MasterChef.deploy(await aitoken.getAddress(), startBlock, rewardPerBlock);
  await masterChef.waitForDeployment();
  console.log("MasterChef deployed to:", await masterChef.getAddress());

  // Transfer half of AI token supply to MasterChef
  await aitoken.transfer(await masterChef.getAddress(), halfSupply);
  console.log("Transferred half of AI token supply to MasterChef");

  // Add pools to MasterChef
  const defaultAllocPoint = 100n;
  const defaultLockupPeriod = 86400n; // 1 day in seconds

  // Add aitoken pool
  await masterChef.addPool(await aitoken.getAddress(), defaultAllocPoint, defaultLockupPeriod);
  console.log("aitoken pool added to MasterChef");

  // Add aidstoken pool with 0 lockup period
  await masterChef.addPool(await aidstoken.getAddress(), 100n, 0n);
  console.log("aidstoken pool added to MasterChef (0 lockup period)");

  // Add depintoken pool
  await masterChef.addPool(await depintoken.getAddress(), defaultAllocPoint, defaultLockupPeriod);
  console.log("depintoken pool added to MasterChef");

  console.log("Deployment and setup completed!");

  // Log important information
  console.log("\nDeployment Summary:");
  console.log("aitoken address:", await aitoken.getAddress());
  console.log("aidstoken address:", await aidstoken.getAddress());
  console.log("depintoken address:", await depintoken.getAddress());
  console.log("MasterChef address:", await masterChef.getAddress());
  console.log("Reward token (AI) address:", await aitoken.getAddress());
  console.log("Start block:", startBlock.toString());
  console.log("Reward per block:", hre.ethers.formatEther(rewardPerBlock), "AI tokens");
  console.log("\nPool Information:");
  console.log("Pool 0 (aitoken): allocPoint =", defaultAllocPoint.toString(), ", lockupPeriod =", defaultLockupPeriod.toString());
  console.log("Pool 1 (aidstoken): allocPoint = 100, lockupPeriod = 0");
  console.log("Pool 2 (depintoken): allocPoint =", defaultAllocPoint.toString(), ", lockupPeriod =", defaultLockupPeriod.toString());

  // Update .env.local file
  const envPath = path.resolve(__dirname, '../frontend/.env.local');
  let envContent = '';

  // Read existing .env.local file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add new environment variables
  const newEnvVariables = {
    NEXT_PUBLIC_AITOKEN_ADDRESS: await aitoken.getAddress(),
    NEXT_PUBLIC_AIDSTOKEN_ADDRESS: await aidstoken.getAddress(),
    NEXT_PUBLIC_DEPINTOKEN_ADDRESS: await depintoken.getAddress(),
    NEXT_PUBLIC_MASTERCHEF_ADDRESS: await masterChef.getAddress(),
  };

  // Update existing variables or add new ones
  for (const [key, value] of Object.entries(newEnvVariables)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      // Update existing variable
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new variable
      envContent += `\n${key}=${value}`;
    }
  }

  // Write updated content back to .env.local
  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log("\n.env.local file updated with contract addresses.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });