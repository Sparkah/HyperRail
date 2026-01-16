import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Token } from "@/types/deposit";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  token: Token | null;
}

export function AmountInput({ value, onChange, token }: AmountInputProps) {
  const handleMaxClick = () => {
    if (token?.balance) {
      onChange(token.balance.replace(/,/g, ''));
    }
  };

  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Amount</span>
        {token?.balance && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMaxClick}
            className="text-xs text-primary hover:text-primary/80"
          >
            MAX
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="text"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-3xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
        />
        {token && (
          <span className="text-xl text-muted-foreground">{token.symbol}</span>
        )}
      </div>
      {token?.balance && (
        <div className="text-sm text-muted-foreground">
          Available: {token.balance} {token.symbol}
        </div>
      )}
    </div>
  );
}
