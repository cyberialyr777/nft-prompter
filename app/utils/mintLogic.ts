/**
 * mintLogic.ts – Persona A (Arquitecto de Minting)
 *
 * Recibe la `metadataUrl` que ya generó la Persona B (Pinata/IPFS)
 * y mintea el NFT Master Edition en Solana Devnet usando Metaplex.
 *
 * Bridge: usa window.solana (Phantom injected provider) directamente
 * porque Solana Kit v2 WalletSession es incompatible con Metaplex v1.
 */

import {
    Metaplex,
    walletAdapterIdentity,
    irysStorage,
    toBigNumber,
    type WalletAdapter as MetaplexWalletAdapter,
} from "@metaplex-foundation/js";
import {
    Connection,
    clusterApiUrl,
    PublicKey,
    Transaction as Web3Transaction,
} from "@solana/web3.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Parámetros de entrada para mintear un NFT. */
export interface MintNFTParams {
    /** Dirección pública del wallet conectado (base58 string). */
    walletAddress: string;
    /** Nombre del NFT (visible en exploradores y marketplaces). */
    name: string;
    /**
     * URL de la metadata JSON ya subida a IPFS por la Persona B.
     * Ejemplo: "https://gateway.pinata.cloud/ipfs/Qm..."
     */
    metadataUrl: string;
}

/** Resultado del proceso de minting. */
export interface MintNFTResult {
    /** Dirección pública del mint account (token único). */
    mintAddress: string;
    /** URL directa a Solscan (Devnet) para explorar el NFT. */
    solscanUrl: string;
}

// ─── Phantom window.solana types ─────────────────────────────────────────────

declare global {
    interface Window {
        solana?: {
            isPhantom?: boolean;
            publicKey?: { toBase58(): string };
            signTransaction(tx: Web3Transaction): Promise<Web3Transaction>;
            signAllTransactions(
                txs: Web3Transaction[],
            ): Promise<Web3Transaction[]>;
        };
    }
}

// ─── Bridge: Phantom window.solana → Metaplex Wallet Adapter ─────────────────

/**
 * Creates a MetaplexWalletAdapter using Phantom's injected window.solana.
 * This is the most reliable approach because window.solana natively speaks
 * @solana/web3.js v1 Transaction format — exactly what Metaplex expects.
 */
function getPhantomWalletAdapter(
    walletAddress: string,
): MetaplexWalletAdapter {
    const phantom = window.solana;

    if (!phantom || !phantom.isPhantom) {
        throw new Error(
            "Phantom wallet no detectado. Por favor instala Phantom.",
        );
    }

    const pubkey = new PublicKey(walletAddress);

    console.log("🟡 [MINT] Using Phantom window.solana for signing");
    console.log("🟡 [MINT] Phantom publicKey:", phantom.publicKey?.toBase58());

    return {
        publicKey: pubkey,
        signTransaction: (tx: Web3Transaction) => phantom.signTransaction(tx),
        signAllTransactions: (txs: Web3Transaction[]) =>
            phantom.signAllTransactions(txs),
    };
}

// ─── Función Principal ────────────────────────────────────────────────────────

/**
 * Mintea un NFT Master Edition en Solana Devnet.
 *
 * NO sube metadata — eso ya lo hizo Persona B.
 * Solo recibe la metadataUrl de IPFS y ejecuta el minting on-chain.
 */
export async function mintAIgeneratedNFT(
    params: MintNFTParams,
): Promise<MintNFTResult> {
    const { walletAddress, name, metadataUrl } = params;

    console.log("🟡 [MINT] === mintAIgeneratedNFT called ===");
    console.log("🟡 [MINT] walletAddress:", walletAddress);
    console.log("🟡 [MINT] name:", name);
    console.log("🟡 [MINT] metadataUrl:", metadataUrl);

    // 1. Validar wallet
    if (!walletAddress) {
        throw new Error(
            "Wallet no conectado. Por favor conecta tu wallet antes de mintear.",
        );
    }

    // 2. Configurar conexión a Devnet
    console.log("🟡 [MINT] Connecting to Devnet...");
    const connection = new Connection(clusterApiUrl("devnet"), {
        commitment: "confirmed",
    });

    // 3. Bridge: usar Phantom directamente (compatible con Metaplex)
    console.log("🟡 [MINT] Setting up Phantom adapter...");
    const metaplexWallet = getPhantomWalletAdapter(walletAddress);

    // 4. Inicializar Metaplex
    console.log("🟡 [MINT] Initializing Metaplex...");
    const metaplex = Metaplex.make(connection)
        .use(walletAdapterIdentity(metaplexWallet))
        .use(
            irysStorage({
                address: "https://devnet.irys.xyz",
                providerUrl: clusterApiUrl("devnet"),
                timeout: 60_000,
            }),
        );

    // 5. Mintear el NFT
    console.log("🟡 [MINT] Calling metaplex.nfts().create()...");
    const { nft } = await metaplex.nfts().create({
        uri: metadataUrl,
        name,
        sellerFeeBasisPoints: 500, // 5% royalties
        isMutable: true,
        maxSupply: toBigNumber(0), // Master Edition
    });

    // 6. Construir resultado
    const mintAddress = nft.mint.address.toBase58();
    const solscanUrl = `https://solscan.io/token/${mintAddress}?cluster=devnet`;

    console.log("✅ NFT minteado exitosamente!");
    console.log(`   Mint Address : ${mintAddress}`);
    console.log(`   Metadata URL : ${metadataUrl}`);
    console.log(`   Solscan URL  : ${solscanUrl}`);

    return { mintAddress, solscanUrl };
}
