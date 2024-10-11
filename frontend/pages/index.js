import { useState, useEffect } from 'react';
import { useAccount, useDisconnect, useWriteContract, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';

// Hardcoded standard ERC-20 ABI for approve function
const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }],
    "name": "allowance",
    "outputs": [{ "name": "remaining", "type": "uint256" }],
    "type": "function"
  }
];

// Contract addresses
const AITokenAddress = process.env.NEXT_PUBLIC_AITOKEN_ADDRESS || '0xYourTokenAddress';
const MasterChefAddress = process.env.NEXT_PUBLIC_MASTERCHEF_ADDRESS || '0xMasterChefAddress';

export default function Home() {
  const [approveAmount, setApproveAmount] = useState('');
  const [mounted, setMounted] = useState(false);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Log contract addresses to verify they are correct
  console.log('AITokenAddress:', AITokenAddress);
  console.log('MasterChefAddress:', MasterChefAddress);

  // Fetch allowance using useReadContract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: AITokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, MasterChefAddress],
    enabled: Boolean(address),
  });

  // Log fetched allowance to confirm it retrieves correctly
  useEffect(() => {
    if (allowance !== undefined) {
      console.log('Fetched allowance:', allowance.toString());
    }
  }, [allowance]);

  // Setup approve function using useWriteContract
  const { writeContract, isLoading: isApproving } = useWriteContract();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleApprove = async () => {
    if (!approveAmount) return;

    try {
      const amount = parseEther(approveAmount);
      console.log('Approve amount (in wei):', amount.toString());

      await writeContract({
        abi: ERC20_ABI,
        address: AITokenAddress,
        functionName: 'approve',
        args: [MasterChefAddress, amount],
        onSuccess: () => {
          console.log('Transaction successful');
          refetchAllowance();
          setApproveAmount('');
        },
      });
    } catch (error) {
      console.error('Contract call error:', error);
      alert(`Error: ${error.message || 'Contract call failed'}`);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-4">AI Token Approval</h2>
                <ConnectButton />

                {isConnected && (
                  <>
                    <p>Connected: {address}</p>
                    {allowance !== undefined ? (
                      <p>Current Allowance: {allowance.toString()}</p>
                    ) : (
                      <p>Loading allowance...</p>
                    )}
                    <div className="mt-4">
                      <input
                        type="text"
                        value={approveAmount}
                        onChange={(e) => setApproveAmount(e.target.value)}
                        placeholder="Amount to approve"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {isApproving ? 'Approving...' : 'Approve'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}