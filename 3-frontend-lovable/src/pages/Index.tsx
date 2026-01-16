import { DepositFlow } from "@/components/deposit/DepositFlow";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-[120px]" />
      </div>
      
      {/* Main content */}
      <div className="relative z-10">
        <DepositFlow />
      </div>
    </div>
  );
};

export default Index;
