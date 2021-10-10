import './App.css';
import { useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider} from '@project-serum/anchor';
import idl from './idl.json';

import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");
const anchor = require('@project-serum/anchor');

const wallets = [ getPhantomWallet() ]


const opts = {
  preflightCommitment: "processed"
}
const programID = new PublicKey(idl.metadata.address);


const escrow_account = anchor.web3.Keypair.generate()
//initialize token minter to fund users with Token A
const token_minter = anchor.web3.Keypair.generate()
//initialize vault handler
const vault_handler = anchor.web3.Keypair.generate()

const deposit_amount = new anchor.BN(123);

function App() {
  const [value] = useState('');

  const wallet = useWallet()

  async function getProvider() {
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    const network = "http://127.0.0.1:8899";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }


  async function initialize() {
    let mintA = null;
    let user_token_account = null;
    let initializerAmount = 500;

    const provider = await getProvider();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(token_minter.publicKey, 10000000000),
        'confirmed airdrop'
      );

    

    mintA = await Token.createMint(
      provider.connection,
      token_minter,
      token_minter.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    user_token_account = await mintA.createAccount(provider.wallet.publicKey);

    await mintA.mintTo(
      user_token_account,
      token_minter.publicKey,
      [token_minter],
      initializerAmount
    );

    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);

    console.log(provider.wallet.publicKey);
    console.log(mintA.publicKey);
    console.log(user_token_account);
    console.log(escrow_account);
    console.log(vault_handler.publicKey);
    console.log(anchor.web3.SystemProgram.programId);
    console.log(TOKEN_PROGRAM_ID);
    console.log(anchor.web3.SYSVAR_RENT_PUBKEY);

      /* interact with the program via rpc */
      await program.rpc.initialize(deposit_amount ,{
        accounts:{
          initializer: provider.wallet.publicKey,
          mint: mintA.publicKey,
          initializerDepositTokenAccount: user_token_account,
          escrowAccount: escrow_account.publicKey,
          vaultHandler: vault_handler.publicKey,
          vaultAccount: vault_handler.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [ escrow_account,provider.wallet.payer, vault_handler],
      });

      const account = await program.account.matchAccount.fetch(escrow_account.publicKey);
      console.log('account: ', account);


  }

  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    return (
      <div className="App">
        <div>
          {
            !value && (<button onClick={initialize}>Initialize</button>)
          }
        </div>
      </div>
    );
  }
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint="http://127.0.0.1:8899">
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
)

export default AppWithProvider;    