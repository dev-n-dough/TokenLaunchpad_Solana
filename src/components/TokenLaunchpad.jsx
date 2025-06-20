import { useState } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {TOKEN_PROGRAM_ID, getMinimumBalanceForRentExemptMint,MINT_SIZE,createInitializeMint2Instruction, getMintLen, ExtensionType, TYPE_SIZE, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, createInitializeMetadataPointerInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccount, createAssociatedTokenAccountInstruction, createMintToInstruction} from "@solana/spl-token";
import { Keypair, Transaction,SystemProgram } from "@solana/web3.js";
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";

export function TokenLaunchpad() {

    const wallet = useWallet();
    const {connection} = useConnection();

    const [name,setName] = useState("");
    const [symbol,setSymbol] = useState("");
    const [uri,setUri] = useState("");
    const [initialSupply,setinitialSupply] = useState();

    async function createToken(){
        // I have copied over the `createMint` function from the library and will make changes according to myself
        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        const keypair = Keypair.generate(); // we have made this for the mint account that is going to be made
        const decimals = 9;
        const mintAuthority = wallet.publicKey;
        const freezeAuthority = wallet.publicKey;

        // create a tx consisting of 2 instructions
        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: keypair.publicKey,
                space: MINT_SIZE,
                lamports,
                programId : TOKEN_PROGRAM_ID,
            }),
            createInitializeMint2Instruction(keypair.publicKey, decimals, mintAuthority, freezeAuthority, TOKEN_PROGRAM_ID),
        );


        // following command is to sign transaction and send it. the third arg,the array is the list of signers that must sign this tx. now the problem is the `payer` is the user, whose pvt key we dont have

        // await sendAndConfirmTransaction(connection, transaction, [payer, keypair], confirmOptions);

        // lets do this instead

        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(keypair);

        await wallet.sendTransaction(transaction,connection);
        console.log("Token mint created at " + keypair.publicKey.toBase58());
    }

    async function createToken2022(){
        const keypair = Keypair.generate(); // we have made this for the mint account that is going to be made
        const decimals = 9;
        const mintAuthority = wallet.publicKey;
        const freezeAuthority = wallet.publicKey;
        const updateAuthority = wallet.publicKey;

        const metadata = {
            mint : keypair.publicKey,
            name,
            symbol,
            uri,
            additionalMetadata :[]
        }

        const mintLen = getMintLen([ExtensionType.MetadataPointer]); // the size of mint account, with `MetadataPointer` extension enabled
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length; 
        // `TYPE_SIZE` => 2 bytes, to tell `TokenExtension`
        // `LENGTH_SIZE` => 2 bytes, to tell how long the metadata is
        // `pack(metadata).length` => the actual length of the metadata (all these are in bytes)

        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

        // create the instructions
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey : wallet.publicKey,
            newAccountPubkey : keypair.publicKey,
            lamports,
            space : mintLen,
            programId : TOKEN_2022_PROGRAM_ID
        });

        const initializeMetadataPointerInstruction = createInitializeMetadataPointerInstruction(
            keypair.publicKey, // mint
            updateAuthority, 
            keypair.publicKey, // metadata address , the same as mint address
            TOKEN_2022_PROGRAM_ID
        ); // for description of inputs values, go to the function declaration.

        const initializeMintInstruction = createInitializeMint2Instruction(
            keypair.publicKey,
            decimals,
            mintAuthority,
            freezeAuthority,
            TOKEN_2022_PROGRAM_ID
        );

        const initializeMetdataInstruction = createInitializeInstruction({
            programId : TOKEN_2022_PROGRAM_ID,
            metadata : keypair.publicKey,
            updateAuthority,
            mint : keypair.publicKey,
            mintAuthority,
            name : metadata.name,
            symbol : metadata.symbol,
            uri : metadata.uri
        })

        const transaction = new Transaction().add(
            createAccountInstruction,
            initializeMetadataPointerInstruction,
            initializeMintInstruction,
            initializeMetdataInstruction
        );

        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(keypair);

        const sig = await wallet.sendTransaction(transaction,connection);
        console.log("Signature :" + sig);
        console.log("Mint created at : " + keypair.publicKey);




        /// Now lets create an ATA for the user(msg.sender), and mint them `initialSupply` amount of tokens

        // compute the ata
        const ata = getAssociatedTokenAddressSync(
            keypair.publicKey,
            wallet.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID
        );

        console.log("Associated token address : " + ata.toBase58());

        // actually create the ata
        const tx2 = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                ata,
                wallet.publicKey,
                keypair.publicKey,
                TOKEN_2022_PROGRAM_ID
            )
        )

        await wallet.sendTransaction(tx2, connection);

        // now mint this new ata, `initialSupply` of tokens
        const tx3 = new Transaction().add(
            createMintToInstruction(
                keypair.publicKey,
                ata,
                mintAuthority,
                initialSupply * 10**decimals,
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );

        await wallet.sendTransaction(tx3, connection);
    }

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            maxWidth: '500px',
            width: '100%'
        }}>
            <h1 style={{
                textAlign: 'center',
                marginBottom: '30px',
                fontSize: '2.2rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>Solana Token Launchpad</h1>
            
            <input 
                type='text' 
                placeholder='Token Name' 
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                    width: '100%',
                    padding: '15px',
                    marginBottom: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                }}
            />
            
            <input 
                type='text' 
                placeholder='Symbol' 
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                style={{
                    width: '100%',
                    padding: '15px',
                    marginBottom: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                }}
            />
            
            <input 
                type='text' 
                placeholder='Metadata URI' 
                value={uri}
                onChange={e => setUri(e.target.value)}
                style={{
                    width: '100%',
                    padding: '15px',
                    marginBottom: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                }}
            />
            
            <input 
                type='number' 
                placeholder='Initial Supply' 
                value={initialSupply}
                onChange={e => setinitialSupply(Number(e.target.value))}
                style={{
                    width: '100%',
                    padding: '15px',
                    marginBottom: '25px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                }}
            />
            
            <button 
                onClick={createToken2022}
                style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    padding: '15px 20px',
                    borderRadius: '10px',
                    fontSize: '18px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    opacity: 1,
                    boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                }}
            >
                🚀 Create a Token
            </button>
        </div>
    )
}