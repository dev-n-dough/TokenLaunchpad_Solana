import { useState } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {TOKEN_PROGRAM_ID, getMinimumBalanceForRentExemptMint,MINT_SIZE,createInitializeMint2Instruction, getMintLen, ExtensionType, TYPE_SIZE, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, createInitializeMetadataPointerInstruction} from "@solana/spl-token";
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
            keypair.publicKey, // metadata address
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
    }

    return  <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
    }}>
        <h1>Solana Token Launchpad</h1>
        <input type='text' placeholder='Name' onChange={e => setName(e.target.value)}></input> <br />
        <input type='text' placeholder='Symbol' onChange={e => setSymbol(e.target.value)}></input> <br />
        <input type='text' placeholder='Metadata URI' onChange={e => setUri(e.target.value)}></input> <br />
        <input type='text' placeholder='Initial Supply' onChange={e => setinitialSupply(Number(e.target.value))}></input> <br />
        <button onClick={createToken2022}>Create a token</button>
    </div>
}