"use client";

import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { mintAIgeneratedNFT } from "./utils/mintLogic";

/* ── Step status type ───────────────────────────────────────────── */
type Step = {
  label: string;
  icon: string;
  status: "pending" | "active" | "done" | "error";
};

const INITIAL_STEPS: Step[] = [
  { label: "Generando imagen con DALL-E 3…", icon: "🎨", status: "pending" },
  { label: "Subiendo a IPFS…", icon: "📦", status: "pending" },
  { label: "Minteando NFT en Solana…", icon: "⛏️", status: "pending" },
  { label: "¡NFT creado!", icon: "✅", status: "pending" },
];

/* ── Result type ────────────────────────────────────────────────── */
type MintResult = {
  mintAddress: string;
  solscanUrl: string;
  imageUrl: string;
};

export default function Home() {
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();

  const address = wallet?.account.address.toString();
  const isConnected = status === "connected";

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Helper to update a step ──────────────────────────────────── */
  function updateStep(index: number, newStatus: Step["status"]) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status: newStatus } : s)),
    );
  }

  /* ── Main flow ────────────────────────────────────────────────── */
  async function handleGenerate() {
    if (!prompt.trim() || !wallet) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));

    try {
      // Step 1-2: DALL-E + IPFS (handled by the API route)
      updateStep(0, "active");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error generando la imagen");
      }

      updateStep(0, "done");
      updateStep(1, "done"); // IPFS upload is also done in the route

      const { metadataUrl, ipfsImageUrl } = await res.json();

      // Step 3: Mint NFT
      updateStep(2, "active");

      const nftName =
        prompt.length > 32 ? prompt.substring(0, 32) + "…" : prompt;

      const mintResult = await mintAIgeneratedNFT({
        wallet,
        name: nftName,
        metadataUrl,
      });

      updateStep(2, "done");
      updateStep(3, "done");

      setResult({
        mintAddress: mintResult.mintAddress,
        solscanUrl: mintResult.solscanUrl,
        imageUrl: ipfsImageUrl,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "error" } : s,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  /* ── Truncate address ─────────────────────────────────────────── */
  function truncateAddress(addr: string) {
    return addr.slice(0, 4) + "…" + addr.slice(-4);
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground bg-grid">
      {/* Background glow orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-8 px-4 py-12 sm:px-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="w-full space-y-3 text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-low bg-card/60 px-4 py-1.5 text-xs font-medium tracking-widest uppercase text-muted backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Devnet
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="gradient-text">NFT Prompter</span>
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-muted">
            Describe tu NFT en texto → la IA genera la imagen → se mintea en tu
            wallet. <strong className="text-foreground">Magia pura.</strong>
          </p>
        </header>

        {/* ── Wallet Section ──────────────────────────────────────── */}
        <section
          className="card-glass w-full p-5 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-lg">
                👻
              </div>
              <div>
                <p className="text-sm font-semibold">Phantom Wallet</p>
                {isConnected && address ? (
                  <p className="font-mono text-xs text-muted">
                    {truncateAddress(address)}
                  </p>
                ) : (
                  <p className="text-xs text-muted">No conectada</p>
                )}
              </div>
            </div>

            {isConnected ? (
              <button onClick={() => disconnect()} className="btn-wallet">
                Desconectar
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => connect(connector.id)}
                    disabled={status === "connecting"}
                    className="btn-wallet"
                  >
                    {status === "connecting"
                      ? "Conectando…"
                      : `Conectar ${connector.name}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Prompt Input ────────────────────────────────────────── */}
        <section
          className="card-glass w-full space-y-4 p-6 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <label htmlFor="nft-prompt" className="block text-lg font-semibold">
            ¿Cómo quieres tu NFT?
          </label>
          <textarea
            id="nft-prompt"
            placeholder='Ej: "Guerrero azteca con armadura de luz neon en un templo futurista"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full resize-none rounded-xl border border-border-low bg-background/60 px-4 py-3 text-base placeholder:text-muted/50 focus:border-purple-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition disabled:opacity-50"
          />
          <button
            id="generate-btn"
            onClick={handleGenerate}
            disabled={!isConnected || !prompt.trim() || loading}
            className="btn-primary w-full text-center"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-5 w-5 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                Procesando…
              </span>
            ) : (
              "⚡ Generar & Mintear NFT"
            )}
          </button>

          {!isConnected && (
            <p className="text-center text-xs text-muted">
              Conecta tu wallet para poder mintear
            </p>
          )}
        </section>

        {/* ── Progress Steps ──────────────────────────────────────── */}
        {(loading || result || error) && (
          <section
            className="card-glass w-full p-6 animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
              Progreso
            </p>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-300 ${step.status === "active"
                      ? "bg-purple-500/10 border border-purple-500/25 animate-progress-pulse"
                      : step.status === "done"
                        ? "bg-green-500/8 border border-green-500/15 text-green-300"
                        : step.status === "error"
                          ? "bg-red-500/10 border border-red-500/25 text-red-400"
                          : "text-muted/60 border border-transparent"
                    }`}
                >
                  <span className="text-base">
                    {step.status === "active" ? (
                      <span className="inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-purple-400/30 border-t-purple-400" />
                    ) : step.status === "error" ? (
                      "❌"
                    ) : (
                      step.icon
                    )}
                  </span>
                  <span className="font-medium">{step.label}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <strong>Error:</strong> {error}
              </div>
            )}
          </section>
        )}

        {/* ── Result Card ─────────────────────────────────────────── */}
        {result && (
          <section className="card-glass w-full overflow-hidden animate-fade-in-up animate-pulse-glow">
            {/* Generated image */}
            <div className="relative aspect-square w-full overflow-hidden bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.imageUrl}
                alt="NFT generado por IA"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            </div>

            <div className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Tu NFT está listo 🎉
                </p>
                <p className="mt-1 text-lg font-bold gradient-text-hot">
                  {prompt.length > 60
                    ? prompt.substring(0, 60) + "…"
                    : prompt}
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-border-low bg-background/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Mint Address</span>
                  <span className="font-mono text-xs text-foreground/80">
                    {truncateAddress(result.mintAddress)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Red</span>
                  <span className="font-medium text-cyan-400">
                    Solana Devnet
                  </span>
                </div>
              </div>

              <a
                href={result.solscanUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary block w-full text-center"
              >
                🔍 Ver en Solscan
              </a>
            </div>
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="pb-6 text-center text-xs text-muted/50">
          Hackathon Project · Powered by DALL-E 3, Solana &amp; Metaplex
        </footer>
      </main>
    </div>
  );
}
