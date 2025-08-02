'use client';

import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Copy, 
  LogOut, 
  ExternalLink,
  Loader2 
} from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';

export function WalletConnectButton() {
  const { 
    account, 
    balance, 
    network, 
    isConnected, 
    isConnecting, 
    handleConnect, 
    handleDisconnect 
  } = useWallet();
  const { toast } = useToast();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number | null) => {
    if (balance === null) return '0 HBAR';
    const hbarBalance = balance / 100000000; // Convert tinybars to HBAR
    return `${hbarBalance.toFixed(2)} HBAR`;
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast({
        title: 'Address Copied',
        description: 'Account ID has been copied to clipboard',
      });
    }
  };

  const openExplorer = () => {
    if (account && network) {
      const baseUrl = network === 'mainnet' 
        ? 'https://hashscan.io/mainnet'
        : 'https://hashscan.io/testnet';
      window.open(`${baseUrl}/account/${account}`, '_blank');
    }
  };

  if (isConnected && account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">{formatAddress(account)}</span>
            <Badge variant="secondary" className="ml-2">
              {network}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Account</p>
              <p className="text-xs leading-none text-muted-foreground">
                {account}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="justify-between">
            <span>Balance</span>
            <span className="font-mono text-sm">
              {formatBalance(balance)}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className="justify-between">
            <span>Network</span>
            <Badge variant="outline" className="capitalize">
              {network}
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy Address</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openExplorer}>
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>View on Explorer</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button 
      onClick={() => handleConnect()} 
      disabled={isConnecting}
      className="gap-2"
    >
      {isConnecting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </span>
      <span className="sm:hidden">
        {isConnecting ? '...' : 'Connect'}
      </span>
    </Button>
  );
}