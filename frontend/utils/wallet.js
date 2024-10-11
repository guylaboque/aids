import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat } from 'wagmi/chains';
import { http } from 'viem'

export const config = getDefaultConfig({
  appName: 'AIDS Token DApp',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [hardhat],
  transports: {
    [hardhat.id]: http(),
  },
});