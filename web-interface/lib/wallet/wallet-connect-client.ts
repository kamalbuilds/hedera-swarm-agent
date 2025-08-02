import { 
  DAppConnector,
  DAppSigner,
  HederaChainId,
  HederaSessionEvent,
  HederaJsonRpcMethod,
  ExtensionData
} from '@hashgraph/hedera-wallet-connect';
import { 
  AccountId, 
  AccountBalanceQuery,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar
} from '@hashgraph/sdk';

export interface WalletConnectionState {
  isConnected: boolean;
  accountId: string | null;
  network: 'testnet' | 'mainnet' | null;
  balance: number | null;
  publicKey: string | null;
}

export class WalletConnectClient {
  private dAppConnector: DAppConnector | null = null;
  private signer: DAppSigner | null = null;
  private accountId: AccountId | null = null;
  private network: 'testnet' | 'mainnet' = 'testnet';
  
  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize DApp metadata
      const metadata = {
        name: 'Hedera Swarm',
        description: 'Decentralized AI Agent Orchestration Platform',
        url: window.location.origin,
        icons: [`${window.location.origin}/logo.png`]
      };

      // Create DApp connector with testnet as default
      const ledgerId = 'testnet';
      const chainId = HederaChainId.Testnet;
      const methods = Object.values(HederaJsonRpcMethod);
      const events = [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged];
      
      this.dAppConnector = new DAppConnector(
        metadata,
        ledgerId,
        process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'hedera-swarm',
        methods,
        events,
        [chainId]
      );

      // Initialize the connector
      await this.dAppConnector.init();

      // Check for existing sessions
      // Sessions will be restored when connect is called
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
    }
  }

  async connect(): Promise<WalletConnectionState> {
    try {
      if (!this.dAppConnector) {
        await this.initialize();
      }

      // Open modal for wallet connection
      const session = await this.dAppConnector!.openModal();
      
      if (!session) {
        throw new Error('No session established');
      }

      // Extract account ID from session
      const accountIdStr = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop();
      if (!accountIdStr) {
        throw new Error('No account ID found in session');
      }

      this.accountId = AccountId.fromString(accountIdStr);
      
      // Determine network from chain ID
      const chainId = session.namespaces?.hedera?.chains?.[0];
      this.network = chainId?.includes('mainnet') ? 'mainnet' : 'testnet';

      // Create signer
      this.createSigner();

      // Get account balance
      const balance = await this.getAccountBalance();

      return {
        isConnected: true,
        accountId: this.accountId.toString(),
        network: this.network,
        balance,
        publicKey: null // Will be fetched separately if needed
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  private createSigner() {
    if (!this.dAppConnector || !this.accountId) {
      throw new Error('DApp connector or account ID not initialized');
    }

    const client = this.network === 'mainnet' 
      ? Client.forMainnet()
      : Client.forTestnet();

    const ledgerId = this.network === 'mainnet' ? 'mainnet' : 'testnet';
    
    this.signer = new DAppSigner(
      this.accountId,
      this.dAppConnector,
      ledgerId
    );

    // Set the signer on the client
    client.setOperator(this.accountId, this.signer as any);
  }

  async disconnect() {
    try {
      if (this.dAppConnector) {
        await this.dAppConnector.disconnect();
        this.dAppConnector = null;
        this.signer = null;
        this.accountId = null;
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }

  async getAccountBalance(): Promise<number | null> {
    try {
      if (!this.accountId) {
        return null;
      }

      const client = this.network === 'mainnet' 
        ? Client.forMainnet()
        : Client.forTestnet();

      const balance = await new AccountBalanceQuery()
        .setAccountId(this.accountId)
        .execute(client);

      return balance.hbars.toTinybars().toNumber();
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return null;
    }
  }

  async executeContract(
    contractId: string,
    functionName: string,
    parameters: ContractFunctionParameters,
    gas: number = 100000,
    payableAmount?: number
  ): Promise<any> {
    try {
      if (!this.signer || !this.accountId) {
        throw new Error('Wallet not connected');
      }

      const client = this.network === 'mainnet' 
        ? Client.forMainnet()
        : Client.forTestnet();

      client.setOperator(this.accountId, this.signer as any);

      const transaction = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(contractId))
        .setGas(gas)
        .setFunction(functionName, parameters);

      if (payableAmount) {
        transaction.setPayableAmount(Hbar.fromTinybars(payableAmount));
      }

      const txResponse = await transaction.execute(client);
      const receipt = await txResponse.getReceipt(client);

      return {
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId?.toString(),
        contractId: contractId
      };
    } catch (error) {
      console.error('Failed to execute contract:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      // Use the signer to sign the message
      const messageBytes = new TextEncoder().encode(message);
      const signatures = await this.signer.sign([messageBytes]);
      
      // Return the first signature as hex
      if (signatures && signatures.length > 0) {
        return signatures[0].signature.toString('hex');
      }
      
      throw new Error('No signature received');
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  getAccountId(): string | null {
    return this.accountId?.toString() || null;
  }

  getNetwork(): 'testnet' | 'mainnet' {
    return this.network;
  }

  isConnected(): boolean {
    return !!this.accountId && !!this.dAppConnector;
  }

  getSigner(): DAppSigner | null {
    return this.signer;
  }

  getClient(): Client {
    const client = this.network === 'mainnet' 
      ? Client.forMainnet()
      : Client.forTestnet();

    if (this.accountId && this.signer) {
      client.setOperator(this.accountId, this.signer as any);
    }

    return client;
  }
}