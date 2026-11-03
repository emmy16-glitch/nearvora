import { ASSETS, DEMO_NGN_RATES, type AssetSymbol } from "@/lib/config/assets";
import { getStore } from "@/lib/database/store";
import { addMinor, convertMinor, type Minor } from "@/lib/money/money";
import type {
  PortfolioSnapshot,
  WalletAsset,
  WalletAssetView,
} from "@/lib/types/domain";

export function getRateNgn(symbol: AssetSymbol): string {
  return DEMO_NGN_RATES[symbol];
}

export function toNgnValue(amount: Minor, symbol: AssetSymbol): Minor {
  return convertMinor(amount, ASSETS[symbol].decimals, DEMO_NGN_RATES[symbol], 2);
}

export function toAssetValue(ngnAmount: Minor, symbol: AssetSymbol): Minor {
  if (symbol === "NGN") return ngnAmount;
  return convertMinor(ngnAmount, 2, invertRate(DEMO_NGN_RATES[symbol]), ASSETS[symbol].decimals);
}

export function invertRate(rate: string): string {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Invalid demo rate");
  return (1 / value).toFixed(12);
}

function viewFor(wallet: WalletAsset): WalletAssetView {
  const asset = ASSETS[wallet.symbol];
  return {
    id: wallet.id,
    symbol: wallet.symbol,
    name: asset.name,
    kind: asset.kind,
    available: wallet.available,
    pending: wallet.pending,
    valueNgn: toNgnValue(addMinor(wallet.available, wallet.pending), wallet.symbol),
    address: wallet.address,
    network: wallet.network,
    color: asset.color,
    rateNgn: DEMO_NGN_RATES[wallet.symbol],
  };
}

export function getPortfolio(userId: string): PortfolioSnapshot {
  const store = getStore();
  const wallets = store.listAssets(userId);
  const assets = wallets.map(viewFor);
  const naira = assets.find((asset) => asset.symbol === "NGN");
  const cryptoValueNgn = assets
    .filter((asset) => asset.kind === "crypto")
    .reduce((sum, asset) => addMinor(sum, asset.valueNgn), "0");
  const totalNgn = addMinor(naira?.valueNgn ?? "0", cryptoValueNgn);

  return {
    totalNgn,
    changePercent: 1.84,
    nairaAvailable: naira?.available ?? "0",
    nairaPending: naira?.pending ?? "0",
    cryptoValueNgn,
    assets,
  };
}

export function getAssetView(userId: string, symbol: AssetSymbol): WalletAssetView | null {
  const wallet = getStore().getAsset(userId, symbol);
  return wallet ? viewFor(wallet) : null;
}

export function getAvailable(userId: string, symbol: AssetSymbol): Minor {
  return getStore().getAsset(userId, symbol)?.available ?? "0";
}

export { ASSETS };
