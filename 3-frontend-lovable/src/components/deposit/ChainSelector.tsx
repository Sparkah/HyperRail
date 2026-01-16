import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chain } from "@/types/deposit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const chains: Chain[] = [
  { id: "ethereum", name: "Ethereum", icon: "⟠" },
  { id: "arbitrum", name: "Arbitrum", icon: "🔵" },
  { id: "polygon", name: "Polygon", icon: "🟣" },
  { id: "optimism", name: "Optimism", icon: "🔴" },
  { id: "base", name: "Base", icon: "🔷" },
];

interface ChainSelectorProps {
  selected: Chain | null;
  onSelect: (chain: Chain) => void;
}

export function ChainSelector({ selected, onSelect }: ChainSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" className="w-full justify-between h-14 text-base">
          <div className="flex items-center gap-3">
            {selected ? (
              <>
                <span className="text-2xl">{selected.icon}</span>
                <span>{selected.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select chain</span>
            )}
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-card border-border">
        {chains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => onSelect(chain)}
            className="flex items-center gap-3 py-3 cursor-pointer hover:bg-secondary"
          >
            <span className="text-2xl">{chain.icon}</span>
            <span>{chain.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
