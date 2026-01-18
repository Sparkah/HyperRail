import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { mainnet, polygon, arbitrum, base, optimism } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyProvider } from '@privy-io/react-auth';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import ClaimPage from "./pages/ClaimPage";
import NotFound from "./pages/NotFound";
import { hyperevm } from "./constants/hyperevm";

// RainbowKit config for deposit flow (L1 chains only)
const config = getDefaultConfig({
  appName: 'HyperRail',
  projectId: '2b777b7455fea8fec791b4d27aa6b193',
  chains: [mainnet, polygon, arbitrum, base, optimism],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
});

const queryClient = new QueryClient();

// Privy app ID - https://dashboard.privy.io
const PRIVY_APP_ID = "cmkj2sh460088l70cemh8vuss";

const App = () => (
  <PrivyProvider
    appId={PRIVY_APP_ID}
    config={{
      appearance: {
        theme: 'dark',
        accentColor: '#10b981',
      },
      embeddedWallets: {
        createOnLogin: 'users-without-wallets',
      },
      defaultChain: hyperevm,
      supportedChains: [hyperevm, mainnet, polygon, arbitrum, base, optimism],
      loginMethods: ['email', 'google', 'apple'],
    }}
  >
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#10b981',
            accentColorForeground: 'white',
            borderRadius: 'large',
          })}
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/claim/:claimId" element={<ClaimPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </PrivyProvider>
);

export default App;
