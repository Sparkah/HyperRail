export type DepositStep = 'entry' | 'preview' | 'progress' | 'success';

export interface Chain {
  id: string;
  name: string;
  icon: string;
}

export interface Token {
  symbol: string;
  name: string;
  icon: string;
  balance?: string;
}

export interface RouteInfo {
  fromChain: Chain;
  fromToken: Token;
  toChain: Chain;
  toToken: Token;
  amount: string;
  estimatedOutput: string;
  estimatedTime: string;
  fees: {
    gas: string;
    bridge: string;
    total: string;
  };
  steps: RouteStep[];
}

export interface RouteStep {
  id: string;
  type: 'swap' | 'bridge' | 'confirm' | 'deposit';
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface DepositState {
  step: DepositStep;
  selectedChain: Chain | null;
  selectedToken: Token | null;
  amount: string;
  route: RouteInfo | null;
  progressSteps: RouteStep[];
  error: string | null;
}
