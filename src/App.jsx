import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css'

import { TokenLaunchpad } from "./components/TokenLaunchpad"


function App() {
  const devnet = clusterApiUrl('devnet');
  const local = "http://localhost:8899";

  return (
    <ConnectionProvider endpoint={devnet}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <div className="app">
            {/* Header */}
            <header className="header">
              <h1 className="logo">🚀 Token Launchpad</h1>
              <div className="wallet-buttons">
                <WalletMultiButton />
                <WalletDisconnectButton />
              </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
              <TokenLaunchpad />
            </main>

            {/* Footer */}
            <footer className="footer">
              <p>Built on Solana ⚡</p>
            </footer>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}


export default App
