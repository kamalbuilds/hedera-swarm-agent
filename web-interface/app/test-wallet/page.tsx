'use client';

import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function TestWalletPage() {
  const {
    account,
    balance,
    network,
    isConnected,
    isConnecting,
    error,
    sessions,
    extensions,
    handleConnect,
    handleDisconnect,
    signMessage,
  } = useWallet();

  const handleTestSign = async () => {
    try {
      const message = `Test message: ${Date.now()}`;
      const signature = await signMessage(message);
      console.log('Signature:', signature);
      alert(`Message signed successfully!\nSignature: ${signature.substring(0, 20)}...`);
    } catch (err: any) {
      alert(`Failed to sign: ${err.message}`);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wallet Connection Test</CardTitle>
          <CardDescription>
            Test your Hedera wallet connection with debugging information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold">Environment</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Network: <Badge>{network}</Badge></div>
              <div>WalletConnect ID: <Badge variant="outline">
                {process.env.NEXT_PUBLIC_WALLETCONNECT_ID ? '✓ Configured' : '✗ Missing'}
              </Badge></div>
              <div>Sessions: <Badge variant="outline">{sessions.length}</Badge></div>
              <div>Extensions: <Badge variant="outline">{extensions.length}</Badge></div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold">Connection Status</h3>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
              <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
            {account && (
              <div className="text-sm space-y-1">
                <div>Account: <code className="bg-black/10 px-2 py-1 rounded">{account}</code></div>
                <div>Balance: <code className="bg-black/10 px-2 py-1 rounded">
                  {balance ? `${(balance / 100000000).toFixed(4)} HBAR` : 'Loading...'}
                </code></div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isConnected ? (
              <Button
                onClick={() => handleConnect()}
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleTestSign}
                  variant="outline"
                  className="flex-1"
                >
                  Test Sign Message
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="flex-1"
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {/* Debug Console */}
          <div className="p-4 bg-black text-white rounded-lg font-mono text-xs">
            <div>Debug Console:</div>
            <div className="mt-2 space-y-1">
              <div>→ WalletConnect Project ID: {process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'NOT SET'}</div>
              <div>→ Network: {network}</div>
              <div>→ Connected: {String(isConnected)}</div>
              <div>→ Connecting: {String(isConnecting)}</div>
              <div>→ Account: {account || 'null'}</div>
              <div>→ Sessions: {JSON.stringify(sessions.map(s => s.topic))}</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>To connect your wallet:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Make sure you have HashPack or Blade wallet installed</li>
              <li>Click "Connect Wallet" button above</li>
              <li>Scan the QR code with your wallet app</li>
              <li>Approve the connection in your wallet</li>
            </ol>
            <p className="mt-2">
              Check the browser console (F12) for detailed debug information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}