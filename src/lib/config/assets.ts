export type AssetKind = "fiat" | "crypto";
export type AssetSymbol = "NGN" | "USDT" | "USDC" | "BTC" | "ETH";

export interface NetworkConfig {
  id: string;
  name: string;
  kind: AssetKind;
  /** Whether the network is a simulated/demo network rather than live custody. */
  demo: boolean;
}

export interface AssetConfig {
  symbol: AssetSymbol;
  name: string;
  kind: AssetKind;
  decimals: number;
  color: string;
  description: string;
  networks: NetworkConfig[];
}

export const ASSETS: Record<AssetSymbol, AssetConfig> = {
  NGN: {
    symbol: "NGN",
    name: "Nigerian Naira",
    kind: "fiat",
    decimals: 2,
    color: "#7ee2a8",
    description: "Naira wallet funds settled through Nearvora's payment partners.",
    networks: [
      { id: "ngn-bank", name: "Nigerian bank transfer", kind: "fiat", demo: true },
    ],
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    kind: "crypto",
    decimals: 6,
    color: "#26a17b",
    description: "Dollar-denominated stablecoin. Demo custody on NEAR testnet.",
    networks: [
      { id: "near-testnet", name: "NEAR Testnet (demo)", kind: "crypto", demo: true },
    ],
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    kind: "crypto",
    decimals: 6,
    color: "#2775ca",
    description: "Regulated dollar stablecoin. Demo custody on NEAR testnet.",
    networks: [
      { id: "near-testnet", name: "NEAR Testnet (demo)", kind: "crypto", demo: true },
    ],
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    kind: "crypto",
    decimals: 8,
    color: "#f7931a",
    description: "Bitcoin via cross-chain Intents. Demo balance only.",
    networks: [
      { id: "bitcoin-testnet", name: "Bitcoin Testnet (demo)", kind: "crypto", demo: true },
    ],
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    kind: "crypto",
    decimals: 18,
    color: "#8f9cf0",
    description: "Ether via cross-chain Intents. Demo balance only.",
    networks: [
      { id: "ethereum-sepolia", name: "Ethereum Sepolia (demo)", kind: "crypto", demo: true },
    ],
  },
};

export const ASSET_SYMBOLS = Object.keys(ASSETS) as AssetSymbol[];
export const CRYPTO_SYMBOLS = ASSET_SYMBOLS.filter((s) => ASSETS[s].kind === "crypto");
export const FIAT_SYMBOLS = ASSET_SYMBOLS.filter((s) => ASSETS[s].kind === "fiat");

/** Simulated NGN reference rates. Never use for real pricing. */
export const DEMO_NGN_RATES: Record<AssetSymbol, string> = {
  NGN: "1",
  USDT: "1584.50",
  USDC: "1581.20",
  BTC: "168500000",
  ETH: "6125000",
};

/** Simulated fixed network fees, denominated in the asset's own units. */
export const DEMO_NETWORK_FEES: Record<AssetSymbol, string> = {
  NGN: "0",
  USDT: "0.80",
  USDC: "0.80",
  BTC: "0.00004",
  ETH: "0.0009",
};

export function getAsset(symbol: string): AssetConfig | undefined {
  if ((ASSET_SYMBOLS as string[]).includes(symbol)) {
    return ASSETS[symbol as AssetSymbol];
  }
  return undefined;
}

export function getNetwork(asset: AssetSymbol, networkId: string): NetworkConfig | undefined {
  return ASSETS[asset].networks.find((network) => network.id === networkId);
}

/**
 * Demo receive addresses are intentionally not valid on any chain. They use a
 * reserved `demo_` prefix so they cannot be mistaken for real deposit addresses.
 */
export function demoReceiveAddress(symbol: AssetSymbol, networkId: string): string {
  if (symbol === "NGN") return "Nearvora demo virtual account — NGN only";
  const slug = symbol.toLowerCase();
  return `demo_${slug}_${networkId.replace(/-/g, "_")}_nearvora_receive_only`;
}

export function isDemoAddress(address: string): boolean {
  return address.startsWith("demo_");
}
