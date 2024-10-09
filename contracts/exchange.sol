// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SimplifiedTokenSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public tokenA;  // TokenA contract
    IERC20 public tokenB;  // TokenB contract
    IERC20 public tokenC;  // TokenC contract

    constructor(IERC20 _tokenA, IERC20 _tokenB, IERC20 _tokenC) Ownable(msg.sender) ReentrancyGuard() {
        tokenA = _tokenA;
        tokenB = _tokenB;
        tokenC = _tokenC;
    }

    // Swap equal amounts of TokenB and TokenC for TokenA
    function swap(uint256 amount) external nonReentrant {
        // Ensure both TokenB and TokenC amounts are the same
        require(amount > 0, "Amount must be greater than 0");
        
        // Validate that the user has enough balance and allowance for both tokens
        require(tokenB.allowance(msg.sender, address(this)) >= amount, "TokenB: Insufficient allowance");
        require(tokenC.allowance(msg.sender, address(this)) >= amount, "TokenC: Insufficient allowance");
        
        // Check if the contract has enough TokenA to swap
        require(tokenA.balanceOf(address(this)) >= amount, "TokenA: Insufficient balance in contract");

        // Transfer TokenB and TokenC from user to contract
        tokenB.safeTransferFrom(msg.sender, address(this), amount);
        tokenC.safeTransferFrom(msg.sender, address(this), amount);

        // Transfer TokenA to the user
        tokenA.safeTransfer(msg.sender, amount);
    }

    // Emergency withdrawal by the owner
    function emergencyWithdraw(IERC20 _token, uint256 _amount) external onlyOwner {
        _token.safeTransfer(msg.sender, _amount);
    }
}