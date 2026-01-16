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
  { symbol: "USDC", name: "USD Coin", icon: "💵", balance: "2,450.00" },
  { symbol: "ETH", name: "Ethereum", icon: "⟠", balance: "1.245" },
  { symbol: "USDT", name: "Tether", icon: "💲", balance: "1,200.00" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", icon: "₿", balance: "0.0234" },
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
                  <div>{selected.symbol}</div>
                  {selected.balance && (
                    <div className="text-xs text-muted-foreground">
                      Balance: {selected.balance}
                    </div>
                  )}
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
            className="flex items-center gap-3 py-3 cursor-pointer hover:bg-secondary"
          >
            <span className="text-2xl">{token.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{token.symbol}</div>
              <div className="text-xs text-muted-foreground">{token.name}</div>
            </div>
            {token.balance && (
              <div className="text-sm text-muted-foreground">{token.balance}</div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
