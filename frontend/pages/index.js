import { useState } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Box, Flex, Heading } from '@chakra-ui/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import FarmAiForm from '../components/FarmAiForm';

export default function Home() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <Box minH="100vh" bg="gray.50" py={6}>
      {/* Main Layout */}
      <Flex justify="space-between" align="center" px={8} py={4} bg="white" boxShadow="md">
        {/* Tabs Wrapper */}
        <Tabs variant="soft-rounded" colorScheme="blue" index={selectedTab} onChange={setSelectedTab} isFitted>
          {/* Tab List for navigation */}
          <TabList>
            <Tab>AIDepinSupertoken</Tab>
            <Tab>Farm</Tab>
            <Tab>Mint</Tab>
          </TabList>
        </Tabs>

        {/* Wallet Connect Button */}
        <ConnectButton />
      </Flex>

      {/* Tab Panels */}
      <Tabs index={selectedTab} onChange={setSelectedTab} mt={6}>
        <TabPanels>
          {/* Home Tab */}
          <TabPanel>
            <Box textAlign="center" p={6}>
              <Heading as="h1" size="xl">
                Welcome to AIDepinSupertoken
              </Heading>
            </Box>
          </TabPanel>

          {/* Farm Tab */}
          <TabPanel>
            <Box textAlign="center" p={6}>
              <FarmAiForm />
            </Box>
          </TabPanel>

          {/* Mint Tab */}
          <TabPanel>
            <Box textAlign="center" p={6}>
              <Heading as="h1" size="2xl">
                Mint
              </Heading>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}