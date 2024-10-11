import { useState, useEffect } from 'react';
import { Box, Heading, Input, VStack, Text, Button } from '@chakra-ui/react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import AIDSTokenABI from '../contracts/AIDSToken.json';
import MasterChefABI from '../contracts/MasterChef.json';

export default function FarmAiForm() {
  const [amount, setAmount] = useState('');
  const [approvedAmount, setApprovedAmount] = useState(BigInt(0));

  // Environment variables
  const AIDSTokenAddress = process.env.NEXT_PUBLIC_AIDSTOKEN_ADDRESS;
  const MasterChefAddress = process.env.NEXT_PUBLIC_MASTERCHEF_ADDRESS;

  // Get connected wallet account information
  const { address } = useAccount();

  // Read balance of AIDS Token for the connected wallet
  const { data: balance } = useReadContract({
    address: AIDSTokenAddress,
    abi: AIDSTokenABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address),
  });

  // Read approved amount of AIDS Token for the MasterChef contract
  const { data: allowance } = useReadContract({
    address: AIDSTokenAddress,
    abi: AIDSTokenABI,
    functionName: 'allowance',
    args: [address, MasterChefAddress],
    enabled: Boolean(address),
  });

  // Read user's total deposit in Pool 1 (pid = 1)
  const { data: userDeposit, refetch: refetchUserDeposit } = useReadContract({
    address: MasterChefAddress,
    abi: MasterChefABI,
    functionName: 'getUserTotalDeposit',
    args: [1, address], // Pool id 1, user's address
    enabled: Boolean(address),
  });

  // Update the approved amount whenever allowance data changes
  useEffect(() => {
    if (allowance) {
      setApprovedAmount(BigInt(allowance));
    }
  }, [allowance]);

  // Use write contract for approval of AIDS tokens
  const { writeContract: writeApproveContract, isLoading: isApproving } = useWriteContract();

  // Use write contract for deposit to the MasterChef contract
  const { writeContract: writeDepositContract, isLoading: isDepositing } = useWriteContract();

  // Convert balance and deposit from BigInt to readable format
  const formattedBalance = balance ? Number(balance) / 1e18 : null;
  const formattedUserDeposit = userDeposit ? Number(userDeposit) / 1e18 : 0;
  const enteredAmountInWei = amount ? parseEther(amount) : BigInt(0);

  // Determine button label and whether it's disabled
  let buttonLabel = 'Please enter amount';
  let isButtonDisabled = true;

  if (enteredAmountInWei > BigInt(0)) {
    if (approvedAmount >= enteredAmountInWei) {
      buttonLabel = 'Deposit';
      isButtonDisabled = isDepositing;
    } else {
      buttonLabel = 'Approve AIDS';
      isButtonDisabled = isApproving;
    }
  }

  // Handle the approval action
  const handleApprove = async () => {
    if (buttonLabel === 'Approve AIDS') {
      try {
        await writeApproveContract({
          abi: AIDSTokenABI,
          address: AIDSTokenAddress,
          functionName: 'approve',
          args: [MasterChefAddress, enteredAmountInWei],
          onSuccess: () => {
            console.log(`Successfully approved ${amount} AIDS tokens.`);
          },
          onError: (error) => {
            console.error('Approval error:', error);
          },
        });
      } catch (error) {
        console.error('Error in approval:', error);
      }
    }
  };

  // Handle the deposit action
  const handleDeposit = async () => {
    if (buttonLabel === 'Deposit') {
      try {
        await writeDepositContract({
          abi: MasterChefABI,
          address: MasterChefAddress,
          functionName: 'deposit',
          args: [1, enteredAmountInWei], // pid = 1 for Pool 1, and amount in wei
          onSuccess: () => {
            console.log(`Successfully deposited ${amount} AIDS tokens.`);
            refetchUserDeposit(); // Refresh the user's deposit amount after successful deposit
            setAmount(''); // Reset the input field
          },
          onError: (error) => {
            console.error('Deposit error:', error);
          },
        });
      } catch (error) {
        console.error('Error in deposit:', error);
      }
    }
  };

  return (
    <Box textAlign="center" p={6}>
      <Heading as="h1" size="2xl" mb={4}>
        Farm
      </Heading>
      <VStack spacing={4} align="center">
        {/* Input field for deposit amount */}
        <Input
          placeholder="Amount to deposit"
          width="60%"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* Display available balance */}
        <Text fontSize="md" color="gray.600">
          Available balance: {formattedBalance !== null ? formattedBalance.toFixed(4) : 'Loading...'} AIDS
        </Text>

        {/* Display current deposit */}
        <Text fontSize="md" color="gray.600">
          Current deposit: {formattedUserDeposit.toFixed(4)} AIDS
        </Text>

        {/* Approval/Deposit Button */}
        <Button
          colorScheme={buttonLabel === 'Approve AIDS' ? 'blue' : 'green'}
          variant="solid"
          width="60%"
          isDisabled={isButtonDisabled}
          onClick={buttonLabel === 'Approve AIDS' ? handleApprove : handleDeposit}
          isLoading={(isApproving && buttonLabel === 'Approve AIDS') || (isDepositing && buttonLabel === 'Deposit')}
        >
          {buttonLabel}
        </Button>
      </VStack>
    </Box>
  );
}