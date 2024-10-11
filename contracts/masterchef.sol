// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MasterChef is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct DepositInfo {
        uint256 amount;        // Amount of tokens deposited
        uint256 withdrawTime;  // Time when this deposit can be withdrawn
    }

    struct UserInfo {
        DepositInfo[] deposits; // Array of deposits with individual withdrawal times
        uint256 rewardDebt;     // Reward debt (for calculating pending rewards)
    }

    struct PoolInfo {
        IERC20 stakingToken;        // The token being staked
        uint256 allocPoint;         // How many allocation points assigned to this pool
        uint256 lastRewardBlock;    // Last block number where rewards were distributed
        uint256 accRewardPerShare;  // Accumulated rewards per share
        uint256 lockupPeriod;       // Timelock for withdrawals (in seconds)
        uint256 totalStaked;
    }

    IERC20 public rewardToken;       // Reward token for distribution
    uint256 public rewardPerBlock;   // Reward tokens distributed per block
    uint256 public totalAllocPoint = 0;  // Total allocation points across all pools
    uint256 public startBlock;       // Block number when rewards start

    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 reward);

    constructor(IERC20 _rewardToken, uint256 _startBlock, uint256 _rewardPerBlock) Ownable(msg.sender) {
        rewardToken = _rewardToken;   // Set the reward token
        startBlock = _startBlock;     // Set the block from which rewards start
        rewardPerBlock = _rewardPerBlock; // Set rewards distributed per block
    }

    // Add a new pool for staking
    function addPool(IERC20 _stakingToken, uint256 _allocPoint, uint256 _lockupPeriod) external onlyOwner {
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint += _allocPoint;

        poolInfo.push(PoolInfo({
            stakingToken: _stakingToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accRewardPerShare: 0,
            lockupPeriod: _lockupPeriod,
            totalStaked: 0  // Initialize totalStaked to 0 for new pools
        }));
    }

    // View function to see pending rewards
    function pendingRewards(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 stakedSupply = pool.stakingToken.balanceOf(address(this));

        if (block.number > pool.lastRewardBlock && stakedSupply > 0) {
            uint256 multiplier = block.number - pool.lastRewardBlock;
            uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;
            accRewardPerShare += (reward * 1e12) / stakedSupply;
        }

        return (totalStaked(user) * accRewardPerShare) / 1e12 - user.rewardDebt;
    }

    // Deposit staking tokens to earn rewards
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        updatePool(_pid);

        // Calculate and send pending rewards
        if (user.deposits.length > 0) {
            uint256 pending = (totalStaked(user) * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                rewardToken.safeTransfer(msg.sender, pending);
                emit Harvest(msg.sender, _pid, pending);
            }
        }

        // Add the new deposit
        if (_amount > 0) {
            pool.stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
            user.deposits.push(DepositInfo({
                amount: _amount,
                withdrawTime: block.timestamp + pool.lockupPeriod
            }));
            pool.totalStaked += _amount;
        }

        user.rewardDebt = (totalStaked(user) * pool.accRewardPerShare) / 1e12;

        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw staking tokens and claim rewards
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        uint256 withdrawable = withdrawableBalance(_pid, msg.sender);
        require(withdrawable >= _amount, "Withdraw: amount exceeds withdrawable");

        updatePool(_pid);

        // First, calculate and update reward debt
        uint256 pending = (totalStaked(user) * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        user.rewardDebt = (totalStaked(user) - _amount) * pool.accRewardPerShare / 1e12;

        // Now transfer pending rewards
        if (pending > 0) {
            rewardToken.safeTransfer(msg.sender, pending);
            emit Harvest(msg.sender, _pid, pending);
        }

        // Finally, remove from deposits and transfer staking tokens back to user
        removeWithdrawnAmount(user, _amount);
        pool.stakingToken.safeTransfer(msg.sender, _amount);
        pool.totalStaked -= _amount;  // Update total staked amount

        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Emergency withdrawal without rewards and before timelock ends
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        require(totalStaked(user) > 0, "EmergencyWithdraw: no staked amount");

        uint256 stakedAmount = totalStaked(user);

        // Transfer staked tokens back to user without checking timelock or giving rewards
        pool.stakingToken.safeTransfer(msg.sender, stakedAmount);

        // Reset user data for this pool
        delete user.deposits;
        user.rewardDebt = 0;

        emit Withdraw(msg.sender, _pid, stakedAmount);
    }

    // Helper to remove a specific withdrawable amount from the user's deposits
    function removeWithdrawnAmount(UserInfo storage user, uint256 _amount) internal {
        uint256 remaining = _amount;
        for (uint256 i = 0; i < user.deposits.length && remaining > 0; i++) {
            if (user.deposits[i].withdrawTime <= block.timestamp) {
                if (user.deposits[i].amount <= remaining) {
                    remaining -= user.deposits[i].amount;
                    user.deposits[i].amount = 0;
                } else {
                    user.deposits[i].amount -= remaining;
                    remaining = 0;
                }
            }
        }
    }

    // View function to see how much is currently withdrawable
    function withdrawableBalance(uint256 _pid, address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_pid][_user];
        uint256 withdrawable = 0;
        for (uint256 i = 0; i < user.deposits.length; i++) {
            if (block.timestamp >= user.deposits[i].withdrawTime) {
                withdrawable += user.deposits[i].amount;
            }
        }
        return withdrawable;
    }

    // Helper to calculate total staked amount for a user
    function totalStaked(UserInfo storage user) internal view returns (uint256) {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < user.deposits.length; i++) {
            totalAmount += user.deposits[i].amount;
        }
        return totalAmount;
    }

    // Update reward variables for a single pool
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        uint256 stakedSupply = pool.stakingToken.balanceOf(address(this));
        if (stakedSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = block.number - pool.lastRewardBlock;
        uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;

        pool.accRewardPerShare += (reward * 1e12) / stakedSupply;
        pool.lastRewardBlock = block.number;
    }

    // Add a function to get TVL for a specific pool
    function getPoolTVL(uint256 _pid) public view returns (uint256) {
        return poolInfo[_pid].totalStaked;
    }

    // Add a function to get TVL for all pools
    function getAllPoolsTVL() public view returns (uint256[] memory) {
        uint256[] memory tvls = new uint256[](poolInfo.length);
        for (uint256 i = 0; i < poolInfo.length; i++) {
            tvls[i] = poolInfo[i].totalStaked;
        }
        return tvls;
    }

    function getUserTotalDeposit(uint256 _pid, address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_pid][_user];
        return totalStaked(user);
    }

    // Add a new harvest function to allow users to claim rewards without withdrawing staked tokens
    function harvest(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        // Update the pool to ensure rewards are up to date
        updatePool(_pid);

        // Calculate pending rewards
        uint256 pending = (totalStaked(user) * pool.accRewardPerShare) / 1e12 - user.rewardDebt;

        // Update user's reward debt
        user.rewardDebt = (totalStaked(user) * pool.accRewardPerShare) / 1e12;

        // Transfer the pending rewards to the user
        if (pending > 0) {
            rewardToken.safeTransfer(msg.sender, pending);
            emit Harvest(msg.sender, _pid, pending);
        }
    }
}