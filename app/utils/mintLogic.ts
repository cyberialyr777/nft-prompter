/**
 * mintLogic.ts – Persona A (Arquitecto de Minting)
 *
 * Recibe la `metadataUrl` que ya generó la Persona B (Pinata/IPFS)
 * y mintea el NFT Master Edition en Solana Devnet usando Metaplex.
 *
 * Bridge: Solana Kit v2 (WalletSession) → Metaplex Wallet Adapter
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
    /** Instancia del wallet conectado (del useWalletConnection de @solana/react-hooks). */
    wallet: any; // WalletSession from @solana/client – typed as any to avoid cross-version issues
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

// ─── Bridge: Solana Kit v2 WalletSession → Metaplex Wallet Adapter ───────────

/**
 * Convierte el wallet de @solana/react-hooks (WalletSession)
 * al formato que walletAdapterIdentity() de @metaplex-foundation/js espera.
 *
 * WalletSession exposes:
 *   - account.address (Address string)
 *   - account.publicKey (Uint8Array)
 *   - signTransaction?(tx) — optional, uses Kit v2 Transaction type
 *   - sendTransaction?(tx) — optional
 *
 * Metaplex expects:
 *   - publicKey (PublicKey object from @solana/web3.js v1)
 *   - signTransaction(tx: Web3Transaction) → Web3Transaction
 *   - signAllTransactions(txs: Web3Transaction[]) → Web3Transaction[]
 */
function toMetaplexWallet(wallet: any): MetaplexWalletAdapter {
    const pubkey = new PublicKey(wallet.account.address);

    // Bridge signTransaction: serialize v1 → let Phantom sign → deserialize back
    const signTransaction = async (
        tx: Web3Transaction,
    ): Promise<Web3Transaction> => {
        if (!wallet.signTransaction) {
            throw new Error(
                "Wallet does not support signTransaction. Please use Phantom.",
            );
        }

        // Serialize the v1 Transaction to bytes
        const serialized = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });

        // The wallet standard adapter in Phantom can sign raw transaction bytes.
        // Under the hood, wallet.signTransaction wraps the Wallet Standard's
        // signTransaction feature which works with serialized transaction bytes.
        const signed = await wallet.signTransaction(serialized);

        // If we get back a Uint8Array/Buffer, deserialize it back to v1 Transaction
        if (signed instanceof Uint8Array || Buffer.isBuffer(signed)) {
            return Web3Transaction.from(signed);
        }

        // If the wallet returned something else (some wallets return the tx object),
        // try to use it directly
        if (signed && typeof signed === "object" && "serialize" in signed) {
            return signed as Web3Transaction;
        }

        // Fallback: try using the raw bytes
        return Web3Transaction.from(Buffer.from(signed as any));
    };

    // signAllTransactions: just map over signTransaction
    const signAllTransactions = async (
        txs: Web3Transaction[],
    ): Promise<Web3Transaction[]> => {
        return Promise.all(txs.map((tx) => signTransaction(tx)));
    };

    return {
        publicKey: pubkey,
        signTransaction,
        signAllTransactions,
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
    const { wallet, name, metadataUrl } = params;

    console.log("🟡 [MINT DEBUG] === mintAIgeneratedNFT called ===");
    console.log("🟡 [MINT DEBUG] name:", name);
    console.log("🟡 [MINT DEBUG] metadataUrl:", metadataUrl);
    console.log("🟡 [MINT DEBUG] wallet:", wallet);
    console.log("🟡 [MINT DEBUG] wallet keys:", wallet ? Object.keys(wallet) : "null");
    console.log("🟡 [MINT DEBUG] wallet.account:", wallet?.account);
    console.log("🟡 [MINT DEBUG] wallet.account.address:", wallet?.account?.address);
    console.log("🟡 [MINT DEBUG] wallet.signTransaction type:", typeof wallet?.signTransaction);

    // 1. Validar wallet conectado
    if (!wallet?.account?.address) {
        throw new Error(
            "Wallet no conectado. Por favor conecta tu wallet antes de mintear.",
        );
    }

    console.log("🟡 [MINT DEBUG] Step 2: Creating Connection...");
    // 2. Configurar conexión a Devnet
    const connection = new Connection(clusterApiUrl("devnet"), {
        commitment: "confirmed",
    });

    console.log("🟡 [MINT DEBUG] Step 3: Creating Metaplex wallet bridge...");
    // 3. Bridge: convertir wallet de Solana Kit al formato Metaplex
    const metaplexWallet = toMetaplexWallet(wallet);
    console.log("🟡 [MINT DEBUG] metaplexWallet.publicKey:", metaplexWallet.publicKey?.toBase58());
    console.log("🟡 [MINT DEBUG] metaplexWallet.signTransaction type:", typeof metaplexWallet.signTransaction);
    console.log("🟡 [MINT DEBUG] metaplexWallet.signAllTransactions type:", typeof metaplexWallet.signAllTransactions);

    console.log("🟡 [MINT DEBUG] Step 4: Initializing Metaplex...");
    // 4. Inicializar Metaplex
    const metaplex = Metaplex.make(connection)
        .use(walletAdapterIdentity(metaplexWallet))
        .use(
            irysStorage({
                address: "https://devnet.irys.xyz",
                providerUrl: clusterApiUrl("devnet"),
                timeout: 60_000,
            }),
        );

    console.log("🟡 [MINT DEBUG] Step 5: Calling metaplex.nfts().create()...");
    console.log("🟡 [MINT DEBUG] Create params:", { uri: metadataUrl, name, sellerFeeBasisPoints: 500, isMutable: true });
    // 5. Mintear el NFT
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
