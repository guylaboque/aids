// scripts/approveToken.js
const { ethers } = require("hardhat");

async function main() {
  // Token contract address
  const tokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Address to approve (the smart contract that will spend the tokens)
  const spenderAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  // Amount to approve (1 token with 18 decimals)
  const amount = ethers.parseUnits("1", 18);

  // Get the signer
  const [signer] = await ethers.getSigners();

  // Get the token contract instance
  const tokenContract = await ethers.getContractAt("IERC20", tokenAddress, signer);

  // Approve the tokens
  console.log("Approving tokens...");
  const tx = await tokenContract.approve(spenderAddress, amount);

  // Wait for the transaction to be mined
  await tx.wait();

  console.log("Approval successful!");
  console.log("Transaction hash:", tx.hash);

  // Check the allowance
  const allowance = await tokenContract.allowance(signer.address, spenderAddress);
  console.log("New allowance:", ethers.formatUnits(allowance, 18));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });