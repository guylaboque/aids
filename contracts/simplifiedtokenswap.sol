// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SimplifiedTokenSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public aidsToken;  // AIDS token contract
    IERC20 public aiToken;    // AI token contract
    IERC20 public depinToken; // DEPIN token contract

    constructor(IERC20 _aidsToken, IERC20 _aiToken, IERC20 _depinToken) Ownable(msg.sender) ReentrancyGuard() {
        aidsToken = _aidsToken;
        aiToken = _aiToken;
        depinToken = _depinToken;
    }

    // Swap equal amounts of AI and DEPIN for AIDS
    function swap(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Validate user's allowance for both AI and DEPIN tokens
        require(aiToken.allowance(msg.sender, address(this)) >= amount, "AI: Insufficient allowance");
        require(depinToken.allowance(msg.sender, address(this)) >= amount, "DEPIN: Insufficient allowance");
        
        // Check if the contract has enough AIDS tokens to complete the swap
        require(aidsToken.balanceOf(address(this)) >= amount, "AIDS: Insufficient balance in contract");

        // Transfer AI and DEPIN from the user to the contract
        aiToken.safeTransferFrom(msg.sender, address(this), amount);
        depinToken.safeTransferFrom(msg.sender, address(this), amount);

        // Transfer AIDS tokens to the user
        aidsToken.safeTransfer(msg.sender, amount);
    }

    // Emergency withdrawal by the owner
    function emergencyWithdraw(IERC20 _token, uint256 _amount) external onlyOwner {
        _token.safeTransfer(msg.sender, _amount);
    }
}