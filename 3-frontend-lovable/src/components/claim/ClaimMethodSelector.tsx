import { motion } from "framer-motion";
import { Wallet, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ClaimMethod = "existing" | "create";

interface ClaimMethodSelectorProps {
  onSelect: (method: ClaimMethod) => void;
}

export function ClaimMethodSelector({ onSelect }: ClaimMethodSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium">How would you like to claim?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose an option to receive your USDC
        </p>
      </div>

      <Button
        variant="outline"
        size="lg"
        className="w-full h-auto py-4 flex items-start gap-4 text-left"
        onClick={() => onSelect("existing")}
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-medium">I have a Hyperliquid wallet</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Connect your existing wallet to claim
          </div>
        </div>
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full h-auto py-4 flex items-start gap-4 text-left"
        onClick={() => onSelect("create")}
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Create a Hyperliquid wallet</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Sign up with email or social login
          </div>
        </div>
      </Button>
    </motion.div>
  );
}
