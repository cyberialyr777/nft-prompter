/**
 * mintLogic.ts – Persona A (Arquitecto de Minting)
 *
 * Recibe la `metadataUrl` que ya generó la Persona B (Pinata/IPFS)
 * y mintea el NFT Master Edition en Solana Devnet usando Metaplex.
 *
 * Flujo completo:
 *   Persona B → POST /api/generate → { metadataUrl, ipfsImageUrl }
 *   Persona A → mintAIgeneratedNFT({ wallet, name, metadataUrl }) → { mintAddress, solscanUrl }
 *   Persona C → app/page.tsx llama a ambas y muestra el resultado
 */

import {
    Metaplex,
    walletAdapterIdentity,
    irysStorage,
    toBigNumber,
    type WalletAdapter as MetaplexWalletAdapter,
} from "@metaplex-foundation/js";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Interface compatible con el wallet de @solana/react-hooks (Solana Kit).
 * El wallet de Solana Kit expone `account.address` como string,
 * por lo que necesitamos este bridge hacia lo que Metaplex espera.
 */
export interface SolanaKitWallet {
    account: {
        address: string; // base58 string (formato de Solana Kit)
    };
    signTransaction?: (...args: unknown[]) => Promise<unknown>;
    signAllTransactions?: (...args: unknown[]) => Promise<unknown[]>;
}

/** Parámetros de entrada para mintear un NFT. */
export interface MintNFTParams {
    /** Instancia del wallet conectado (del useWalletConnection de @solana/react-hooks). */
    wallet: SolanaKitWallet;
    /** Nombre del NFT (visible en exploradores y marketplaces). */
    name: string;
    /**
     * URL de la metadata JSON ya subida a IPFS por la Persona B.
     * Ejemplo: "https://gateway.pinata.cloud/ipfs/Qm..."
     * ⚠️ Persona B ya hizo uploadMetadata — Persona A NO lo repite.
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

// ─── Bridge: Solana Kit → Metaplex Wallet Adapter ────────────────────────────

/**
 * Convierte el wallet de @solana/react-hooks al formato que
 * walletAdapterIdentity() de @metaplex-foundation/js espera.
 *
 * El Solana Kit guarda la dirección como `wallet.account.address` (string),
 * mientras que el wallet-adapter clásico usa `wallet.publicKey` (PublicKey object).
 */
function toMetaplexWallet(wallet: SolanaKitWallet): MetaplexWalletAdapter {
    return {
        publicKey: new PublicKey(wallet.account.address),
        signTransaction: wallet.signTransaction as MetaplexWalletAdapter["signTransaction"],
        signAllTransactions: wallet.signAllTransactions as MetaplexWalletAdapter["signAllTransactions"],
    };
}

// ─── Función Principal ────────────────────────────────────────────────────────

/**
 * Mintea un NFT Master Edition en Solana Devnet.
 *
 * NO sube metadata — eso ya lo hizo Persona B.
 * Solo recibe la metadataUrl de IPFS y ejecuta el minting on-chain.
 *
 * @param params - { wallet, name, metadataUrl }
 * @returns { mintAddress, solscanUrl }
 * @throws Error si el wallet no está conectado o si falla el minting.
 */
export async function mintAIgeneratedNFT(
    params: MintNFTParams
): Promise<MintNFTResult> {
    const { wallet, name, metadataUrl } = params;

    // 1. Validar wallet conectado
    if (!wallet?.account?.address) {
        throw new Error(
            "Wallet no conectado. Por favor conecta tu wallet antes de mintear."
        );
    }

    // 2. Configurar conexión a Devnet
    const connection = new Connection(clusterApiUrl("devnet"), {
        commitment: "confirmed",
    });

    // 3. Bridge: convertir wallet de Solana Kit al formato Metaplex
    const metaplexWallet = toMetaplexWallet(wallet);

    // 4. Inicializar Metaplex con:
    //    - walletAdapterIdentity: quién firma las transacciones
    //    - irysStorage: driver de storage (no se usa para subir, pero Metaplex lo requiere)
    const metaplex = Metaplex.make(connection)
        .use(walletAdapterIdentity(metaplexWallet))
        .use(
            irysStorage({
                address: "https://devnet.irys.xyz",
                providerUrl: clusterApiUrl("devnet"),
                timeout: 60_000,
            })
        );

    // 5. Mintear el NFT usando la metadataUrl que ya subió Persona B a Pinata/IPFS
    //    ✅ NO llamamos uploadMetadata() — Persona B ya lo hizo
    //    toBigNumber(0) = Master Edition con prints ilimitados
    const { nft } = await metaplex.nfts().create({
        uri: metadataUrl,           // ← URL de IPFS de Persona B
        name,
        sellerFeeBasisPoints: 500,  // 5% royalties
        isMutable: true,
        maxSupply: toBigNumber(0),  // Master Edition ilimitado
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
