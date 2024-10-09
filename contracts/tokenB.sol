// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract tokenB is ERC20, Ownable {
    // 1 billion tokens with 18 decimals
    uint256 private constant INITIAL_SUPPLY = 300_000_000 * 10 ** 18;

    constructor() ERC20("tokenB", "TKB") Ownable(msg.sender) {
        // Mint the initial supply to the contract deployer (owner)
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}