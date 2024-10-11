import React, { useState, useEffect } from 'react';
import { Box, Button, Input, Text, VStack, HStack, useToast } from '@chakra-ui/react';
import { useAccount, useBalance, useWriteContract, useSimulateContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import SimplifiedTokenSwapABI from '../contracts/SimplifiedTokenSwap.json';
import AITokenABI from '../contracts/AI.json';
import DEPINTokenABI from '../contracts/DEPIN.json';
import { ethers } from 'ethers';


const AI_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AI_CONTRACT_ADDRESS;
const DEPIN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DEPIN_CONTRACT_ADDRESS;
const SWAP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SIMPLIFIED_TOKEN_SWAP_ADDRESS;

const getAllowance = async (provider, tokenAddress, ownerAddress, spenderAddress) => {
  const tokenContract = new ethers.Contract(tokenAddress, TokenABI, provider);
  const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
  return allowance;
};

const GetAidsForm = () => {
  const [amount, setAmount] = useState('');
  const { address } = useAccount();
  const toast = useToast();

  // Check if contract addresses are set
  useEffect(() => {
    if (!AI_CONTRACT_ADDRESS || !DEPIN_CONTRACT_ADDRESS || !SWAP_CONTRACT_ADDRESS) {
      console.error('One or more contract addresses are not set');
      toast({
        title: 'Configuration Error',
        description: 'Contract addresses are not properly set. Please check your environment variables.',
        status: 'error',
        duration: null,
        isClosable: true,
      });
    }
  }, [toast]);

  // Balances
  const { data: aiBalance } = useBalance({ address, token: AI_CONTRACT_ADDRESS });
  const { data: depinBalance } = useBalance({ address, token: DEPIN_CONTRACT_ADDRESS });

  // Simulate contract interaction
  const { data: simulateResult, error: simulateError } = useSimulateContract({
    address: SWAP_CONTRACT_ADDRESS,
    abi: SimplifiedTokenSwapABI,
    functionName: 'swap',
    args: amount ? [parseEther(amount)] : undefined,
  });

  // Swap function
  const { writeContract, isLoading, isSuccess, isError, error } = useWriteContract();

  // Calculate max amount
  const maxAmount = Math.min(
    aiBalance ? parseFloat(formatEther(aiBalance.value)) : 0,
    depinBalance ? parseFloat(formatEther(depinBalance.value)) : 0
  );

  const handleMaxClick = () => {
    setAmount(maxAmount.toString());
  };

  // ... existing code ...

const { data: aiAllowance } = useAllowance({
  address,
  token: AI_CONTRACT_ADDRESS,
  spender: SWAP_CONTRACT_ADDRESS,
});

const { data: depinAllowance } = useAllowance({
  address,
  token: DEPIN_CONTRACT_ADDRESS,
  spender: SWAP_CONTRACT_ADDRESS,
});

const { writeContract: approveAI } = useWriteContract({
  address: AI_CONTRACT_ADDRESS,
  abi: AITokenABI,
  functionName: 'approve',
});

const { writeContract: approveDepin } = useWriteContract({
  address: DEPIN_CONTRACT_ADDRESS,
  abi: DEPINTokenABI,
  functionName: 'approve',
});

const handleSwap = async () => {
  console.log('Swap button clicked');
  if (!amount) {
    toast({
      title: 'Error',
      description: 'Please enter an amount',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    return;
  }

  const amountInWei = parseEther(amount);

  if (aiAllowance < amountInWei) {
    console.log('Approving AI token...');
    try {
      await approveAI({ args: [SWAP_CONTRACT_ADDRESS, amountInWei] });
      toast({
        title: 'Approval successful',
        description: 'AI token approved for swap',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Approval failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
  }

  if (depinAllowance < amountInWei) {
    console.log('Approving DEPIN token...');
    try {
      await approveDepin({ args: [SWAP_CONTRACT_ADDRESS, amountInWei] });
      toast({
        title: 'Approval successful',
        description: 'DEPIN token approved for swap',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Approval failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
  }

  if (!simulateResult?.request) {
    console.error('Simulation failed:', simulateError);
    toast({
      title: 'Simulation Error',
      description: simulateError?.message || 'Failed to simulate the transaction. Please try again.',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    return;
  }

  try {
    console.log('Attempting to write contract...');
    writeContract(simulateResult.request);
  } catch (error) {
    console.error('Error in writeContract:', error);
    toast({
      title: 'Swap failed',
      description: error.message,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }
};

  useEffect(() => {
    if (isSuccess) {
      console.log('Swap successful');
      toast({
        title: 'Swap successful',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }
    if (isError) {
      console.error('Swap error:', error);
      toast({
        title: 'Swap failed',
        description: error?.message || 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [isSuccess, isError, error, toast]);

  return (
    <Box maxWidth="400px" margin="auto" padding={4}>
      <VStack spacing={4} align="stretch">
        <Text fontSize="2xl" fontWeight="bold">Get AIDS Token</Text>
        
        <HStack>
          <Input 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            type="number"
          />
          <Button onClick={handleMaxClick}>Max</Button>
        </HStack>
        
        <Text>You will receive: {amount} AIDS</Text>
        
        <Button 
          colorScheme="blue" 
          onClick={handleSwap}
          isDisabled={!amount || parseFloat(amount) > maxAmount || isLoading}
          isLoading={isLoading}
        >
          Get AIDS
        </Button>
        
        <Text fontSize="sm">
          Max available: {maxAmount.toFixed(4)} AI/DEPIN
        </Text>

        {simulateError && (
          <Text color="red.500">
            Simulation Error: {simulateError.message}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default GetAidsForm;