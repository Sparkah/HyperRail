/**
 * Chain and token constants fetched from LI.FI API
 * Last updated: 2026-01-17
 *
 * To refresh: curl "https://li.quest/v1/token?chain={chainId}&token={symbol}"
 */

// =============================================================================
// Chain Configuration
// =============================================================================

export const CHAINS = {
  ethereum: { id: 1, name: "Ethereum", icon: "🔷", nativeCurrency: "ETH" },
  polygon: { id: 137, name: "Polygon", icon: "💜", nativeCurrency: "MATIC" },
  arbitrum: { id: 42161, name: "Arbitrum", icon: "🔵", nativeCurrency: "ETH" },
  optimism: { id: 10, name: "Optimism", icon: "🔴", nativeCurrency: "ETH" },
  base: { id: 8453, name: "Base", icon: "🟦", nativeCurrency: "ETH" },
  hyperevm: { id: 999, name: "HyperEVM", icon: "⚡", nativeCurrency: "HYPE" },
} as const;

export type ChainKey = keyof typeof CHAINS;

// Chain ID to chain key lookup
export const CHAIN_ID_TO_KEY: Record<number, ChainKey> = {
  1: "ethereum",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  999: "hyperevm",
};

// =============================================================================
// Token Addresses (from LI.FI API)
// =============================================================================

// Native token placeholder address
const NATIVE = "0x0000000000000000000000000000000000000000" as const;

/**
 * Token addresses per chain, sourced from LI.FI API
 * Format: TOKEN_SYMBOL -> CHAIN_ID -> ADDRESS
 */
export const TOKEN_ADDRESSES: Record<string, Partial<Record<number, `0x${string}`>>> = {
  // USD Coin
  USDC: {
    [CHAINS.ethereum.id]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    [CHAINS.polygon.id]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    [CHAINS.arbitrum.id]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    [CHAINS.optimism.id]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    [CHAINS.base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    [CHAINS.hyperevm.id]: "0xb88339CB7199b77E23DB6E890353E22632Ba630f",
  },

  // Tether USD
  USDT: {
    [CHAINS.ethereum.id]: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    [CHAINS.polygon.id]: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    // Not available on Arbitrum via LI.FI
    [CHAINS.optimism.id]: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    [CHAINS.base.id]: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    [CHAINS.hyperevm.id]: "0xbF2D3b1a37D54ce86d0e1455884dA875a97C87a8",
  },

  // Native ETH (or chain native token)
  ETH: {
    [CHAINS.ethereum.id]: NATIVE,
    [CHAINS.polygon.id]: NATIVE, // Actually MATIC, but LI.FI treats as native
    [CHAINS.arbitrum.id]: NATIVE,
    [CHAINS.optimism.id]: NATIVE,
    [CHAINS.base.id]: NATIVE,
    [CHAINS.hyperevm.id]: NATIVE, // Actually HYPE
  },

  // Wrapped ETH
  WETH: {
    [CHAINS.ethereum.id]: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    [CHAINS.polygon.id]: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    [CHAINS.arbitrum.id]: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    [CHAINS.optimism.id]: "0x4200000000000000000000000000000000000006",
    [CHAINS.base.id]: "0x4200000000000000000000000000000000000006",
    // Not available on HyperEVM via LI.FI
  },

  // Wrapped BTC
  WBTC: {
    [CHAINS.ethereum.id]: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    [CHAINS.polygon.id]: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    [CHAINS.arbitrum.id]: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    [CHAINS.optimism.id]: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
    [CHAINS.base.id]: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
    [CHAINS.hyperevm.id]: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
  },
};

// =============================================================================
// Token Metadata
// =============================================================================

export const TOKENS = {
  USDC: { symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💵" },
  USDT: { symbol: "USDT", name: "Tether USD", decimals: 6, icon: "💲" },
  ETH: { symbol: "ETH", name: "Ethereum", decimals: 18, icon: "⟠" },
  WETH: { symbol: "WETH", name: "Wrapped ETH", decimals: 18, icon: "⟠" },
  WBTC: { symbol: "WBTC", name: "Wrapped BTC", decimals: 8, icon: "₿" },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get token address for a specific chain
 * Returns undefined if token not available on chain
 */
export function getTokenAddress(symbol: string, chainId: number): `0x${string}` | undefined {
  return TOKEN_ADDRESSES[symbol]?.[chainId];
}

/**
 * Check if a token is available on a chain
 */
export function isTokenAvailable(symbol: string, chainId: number): boolean {
  return getTokenAddress(symbol, chainId) !== undefined;
}

/**
 * Get all available tokens for a chain
 */
export function getAvailableTokens(chainId: number): TokenSymbol[] {
  return (Object.keys(TOKENS) as TokenSymbol[]).filter((symbol) =>
    isTokenAvailable(symbol, chainId)
  );
}

/**
 * Check if token is native (ETH, MATIC, etc.)
 */
export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === NATIVE.toLowerCase();
}
