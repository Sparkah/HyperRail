// TokenSelector.tsx
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Token } from "@/types/deposit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tokens: Token[] = [
  { symbol: "USDC", name: "USD Coin", icon: "💵" },
  { symbol: "ETH", name: "Ethereum", icon: "⟠" },
  { symbol: "USDT", name: "Tether", icon: "💲" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", icon: "₿" },
];

interface TokenSelectorProps {
  selected: Token | null;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ selected, onSelect }: TokenSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" className="w-full justify-between h-14 text-base">
          <div className="flex items-center gap-3">
            {selected ? (
              <>
                <span className="text-2xl">{selected.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{selected.symbol}</div>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">Select token</span>
            )}
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-card border-border">
        {tokens.map((token) => (
          <DropdownMenuItem
            key={token.symbol}
            onClick={() => onSelect(token)}
            className="flex items-center gap-3 py-3 cursor-pointer hover:bg-secondary transition-colors"
          >
            <span className="text-2xl">{token.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{token.symbol}</div>
              <div className="text-xs text-muted-foreground">{token.name}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}