'use client';

import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, LedgerId, AccountId, AccountBalanceQuery } from '@hashgraph/sdk';
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
  ExtensionData,
  DAppSigner,
} from '@hashgraph/hedera-wallet-connect';
import { SessionTypes } from '@walletconnect/types';
import { useToast } from '@/components/hooks/use-toast';

declare global {
  interface Window {
    hashpack?: any;
  }
}

// App metadata for WalletConnect
const getAppMetadata = () => {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3000';
    
  return {
    name: 'Hedera Swarm',
    description: 'Decentralized AI Agent Orchestration Platform',
    url: baseUrl,
    icons: [`${baseUrl}/logo.png`]
  };
};

// Session state types
export interface SessionState {
  wallet: {
    isConnected: boolean;
    accountId: string | null;
    session: SessionTypes.Struct | null;
  };
}

// Wallet context type
interface WalletContextType {
  // State
  account: string;
  balance: number | null;
  network: 'testnet' | 'mainnet';
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  
  // WalletConnect
  sessions: SessionTypes.Struct[];
  signers: DAppSigner[];
  extensions: ExtensionData[];
  dAppConnector: DAppConnector | null;
  
  // Methods
  handleConnect: (extensionId?: string) => Promise<void>;
  handleDisconnect: () => Promise<void>;
  signAndExecuteTransaction: (params: { 
    transactionList: string;
    signerAccountId: string;
  }) => Promise<any>;
  signMessage: (message: string) => Promise<string>;
  getBalance: () => Promise<number | null>;
  
  // Utilities
  client: Client;
  sessionState: SessionState;
  setError: (error: string | null) => void;
}

// Default context value
const defaultContext: WalletContextType = {
  account: '',
  balance: null,
  network: 'testnet',
  isConnected: false,
  isConnecting: false,
  error: null,
  sessions: [],
  signers: [],
  extensions: [],
  dAppConnector: null,
  handleConnect: async () => {},
  handleDisconnect: async () => {},
  signAndExecuteTransaction: async () => {},
  signMessage: async () => '',
  getBalance: async () => null,
  client: Client.forTestnet(), // Default to testnet
  sessionState: {
    wallet: {
      isConnected: false,
      accountId: null,
      session: null,
    }
  },
  setError: () => {},
};

// Create context
export const WalletContext = createContext<WalletContextType>(defaultContext);

// Session storage helpers
const STORAGE_KEY = 'hedera_swarm_session';

const persistSession = (walletSession: SessionTypes.Struct | null, accountId: string | null) => {
  if (walletSession && accountId) {
    const sessionData = {
      wallet: {
        isConnected: true,
        accountId,
        session: walletSession,
        topic: walletSession.topic,
      },
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  }
};

const getStoredSession = (): any => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if session is less than 24 hours old
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to parse stored session:', error);
  }
  return null;
};

const clearStoredSession = () => {
  localStorage.removeItem(STORAGE_KEY);
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>([]);
  const [signers, setSigners] = useState<DAppSigner[]>([]);
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<number | null>(null);
  const [extensions, setExtensions] = useState<ExtensionData[]>([]);
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network] = useState<'testnet' | 'mainnet'>('testnet'); // Default to testnet
  const [sessionState, setSessionState] = useState<SessionState>({
    wallet: {
      isConnected: false,
      accountId: null,
      session: null,
    }
  });
  
  const { toast } = useToast();
  
  // Get client based on network (default testnet)
  const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  // Initialize DApp connector
  const init = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      console.log('Initializing DApp connector...');
      
      // Always use testnet by default
      const chainId = network === 'mainnet' ? HederaChainId.Mainnet : HederaChainId.Testnet;
      const ledgerId = network === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;
      
      // Essential RPC methods for wallet interaction
      const methods = [
        HederaJsonRpcMethod.GetNodeAddresses,
        HederaJsonRpcMethod.ExecuteTransaction,
        HederaJsonRpcMethod.SignMessage,
        HederaJsonRpcMethod.SignAndExecuteQuery,
        HederaJsonRpcMethod.SignAndExecuteTransaction,
        HederaJsonRpcMethod.SignTransaction
      ];
      
      const events = [
        HederaSessionEvent.ChainChanged, 
        HederaSessionEvent.AccountsChanged
      ];

      const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID;
      
      if (!walletConnectProjectId || walletConnectProjectId === 'your_walletconnect_project_id_here') {
        throw new Error('Please set NEXT_PUBLIC_WALLETCONNECT_ID in your .env file');
      }

      console.log('Creating DAppConnector with project ID:', walletConnectProjectId);
      
      const appMetadata = getAppMetadata();
      console.log('App metadata:', appMetadata);

      const newDAppConnector = new DAppConnector(
        appMetadata,
        ledgerId,
        walletConnectProjectId,
        methods,
        events,
        [chainId]
      );

      // Initialize with error handling
      try {
        await newDAppConnector.init();
        console.log('DApp connector initialized successfully');
      } catch (initError) {
        console.error('Failed to initialize DApp connector:', initError);
        // Try to initialize with minimal configuration as fallback
        console.log('Trying fallback initialization...');
        const fallbackAppMetadata = getAppMetadata();
        const fallbackConnector = new DAppConnector(
          fallbackAppMetadata,
          ledgerId,
          walletConnectProjectId
        );
        await fallbackConnector.init();
        console.log('DApp connector initialized with fallback configuration');
        setDAppConnector(fallbackConnector);
        setSigners(fallbackConnector.signers || []);
        setExtensions(fallbackConnector.extensions || []);
        setIsInitialized(true);
        return;
      }
      
      setDAppConnector(newDAppConnector);
      setSigners(newDAppConnector.signers);
      setExtensions(newDAppConnector.extensions || []);
      setIsInitialized(true);

      // Try to restore session
      const storedSession = getStoredSession();
      if (storedSession?.wallet.session) {
        try {
          const walletSessions = newDAppConnector.walletConnectClient?.session.getAll();
          const matchingSession = walletSessions?.find(ws => 
            ws.topic === storedSession.wallet.topic
          );
          
          if (matchingSession) {
            setSessions([matchingSession]);
            setAccount(storedSession.wallet.accountId || '');
            setSessionState({
              wallet: {
                isConnected: true,
                accountId: storedSession.wallet.accountId,
                session: matchingSession,
              }
            });
            
            // Fetch balance
            if (storedSession.wallet.accountId) {
              await fetchBalance(storedSession.wallet.accountId);
            }
          } else {
            clearStoredSession();
          }
        } catch (error) {
          console.error('Session restoration failed:', error);
          clearStoredSession();
        }
      }
    } catch (error) {
      console.error('Initialization failed:', error);
      clearStoredSession();
    }
  }, [isInitialized, network]);

  // Fetch account balance
  const fetchBalance = async (accountId: string) => {
    try {
      const accountIdObj = AccountId.fromString(accountId);
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(accountIdObj)
        .execute(client);
      
      const hbarBalance = accountBalance.hbars.toTinybars().toNumber();
      setBalance(hbarBalance);
      return hbarBalance;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return null;
    }
  };

  // Connect wallet
  const handleConnect = async (extensionId?: string) => {
    console.log('Connecting wallet...');
    setIsConnecting(true);
    setError(null);

    try {
      // Ensure connector is initialized
      if (!dAppConnector || !isInitialized) {
        console.log('Connector not initialized, initializing now...');
        await init();
        
        // Wait a bit for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!dAppConnector) {
        throw new Error('Failed to initialize DApp Connector');
      }

      // Clear any existing sessions first
      if (sessions?.length > 0) {
        console.log('Clearing existing sessions before connect');
        try {
          await handleDisconnect();
        } catch (e) {
          console.warn('Failed to clear existing sessions:', e);
        }
      }

      // Get session through modal or extension
      let session: SessionTypes.Struct;
      
      try {
        if (extensionId) {
          console.log('Connecting to extension:', extensionId);
          session = await dAppConnector.connectExtension(extensionId);
        } else {
          console.log('Opening WalletConnect modal...');
          session = await dAppConnector.openModal();
        }
      } catch (connectError: any) {
        console.error('Connection error:', connectError);
        
        // If subscription error, try reconnecting
        if (connectError.message?.includes('Subscribing') || connectError.message?.includes('failed')) {
          console.log('Retrying connection...');
          
          // Reinitialize and retry
          setIsInitialized(false);
          await init();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (dAppConnector) {
            session = await dAppConnector.openModal();
          } else {
            throw new Error('Unable to establish connection after retry');
          }
        } else {
          throw connectError;
        }
      }

      if (!session) {
        throw new Error('No session established');
      }

      const accountId = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop();
      if (!accountId) {
        throw new Error('No account ID in session');
      }

      // Set wallet state
      setSessions([session]);
      setAccount(accountId);
      setSessionState({
        wallet: {
          isConnected: true,
          accountId,
          session,
        }
      });

      // Persist session
      persistSession(session, accountId);

      // Fetch balance
      await fetchBalance(accountId);

      toast({
        title: 'Wallet Connected',
        description: `Connected to ${accountId} on ${network}`,
      });

    } catch (error: any) {
      console.error('Connection error:', error);
      setError(error.message);
      clearStoredSession();
      
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const handleDisconnect = async () => {
    try {
      if (dAppConnector && sessions?.length > 0) {
        for (const session of sessions) {
          try {
            await dAppConnector.disconnect(session.topic);
          } catch (error) {
            console.error('Disconnect error for topic', session.topic, error);
          }
        }
      }

      // Clear state
      setSessions([]);
      setSigners([]);
      setAccount('');
      setBalance(null);
      setSessionState({
        wallet: {
          isConnected: false,
          accountId: null,
          session: null,
        }
      });

      // Clear stored session
      clearStoredSession();

      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected',
      });

    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setError(error.message);
      
      toast({
        title: 'Disconnection Error',
        description: error.message || 'Failed to disconnect',
        variant: 'destructive',
      });
    }
  };

  // Sign and execute transaction
  const signAndExecuteTransaction = async (params: { 
    transactionList: string;
    signerAccountId: string;
  }) => {
    if (!dAppConnector) {
      throw new Error('DAppConnector not initialized');
    }
    
    try {
      const result = await dAppConnector.signAndExecuteTransaction({
        signerAccountId: params.signerAccountId,
        transactionList: params.transactionList
      });

      // Refresh balance after transaction
      await fetchBalance(params.signerAccountId);

      toast({
        title: 'Transaction Successful',
        description: 'Transaction has been executed',
      });

      return result;
    } catch (error: any) {
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to execute transaction',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Sign message
  const signMessage = async (message: string) => {
    if (!dAppConnector || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await dAppConnector.signMessage({
        signerAccountId: account,
        message
      });

      return signature;
    } catch (error: any) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };

  // Get balance helper
  const getBalance = async () => {
    if (!account) return null;
    return fetchBalance(account);
  };

  // Initialize on mount
  useEffect(() => {
    init();
  }, [init]);

  // Auto-refresh balance
  useEffect(() => {
    if (account && sessionState.wallet.isConnected) {
      const interval = setInterval(() => {
        fetchBalance(account);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [account, sessionState.wallet.isConnected]);

  const contextValue: WalletContextType = {
    account,
    balance,
    network,
    isConnected: sessionState.wallet.isConnected,
    isConnecting,
    error,
    sessions,
    signers,
    extensions,
    dAppConnector,
    handleConnect,
    handleDisconnect,
    signAndExecuteTransaction,
    signMessage,
    getBalance,
    client,
    sessionState,
    setError,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook to use wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};