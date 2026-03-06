# 🎨 NFT Prompter

**Describe tu NFT en texto → la IA genera la imagen → se mintea en tu wallet.**

NFT Prompter es una aplicación web que combina inteligencia artificial (DALL-E 3) con la blockchain de Solana para generar y mintear NFTs únicos a partir de un simple prompt de texto. Todo en segundos.

![Solana Devnet](https://img.shields.io/badge/Network-Solana%20Devnet-purple)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4)

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Flujo Técnico](#-flujo-técnico)
- [API Reference](#-api-reference)
- [Módulos Principales](#-módulos-principales)
- [Diseño y Tema](#-diseño-y-tema)

---

## 🚀 Descripción General

NFT Prompter permite a cualquier usuario con una wallet Phantom:

1. **Escribir un prompt** describiendo la imagen NFT que desea.
2. **Generar la imagen** automáticamente usando DALL-E 3 de OpenAI.
3. **Subir a IPFS** la imagen y su metadata usando Pinata.
4. **Mintear el NFT** directamente en Solana Devnet usando Metaplex.

El resultado es un NFT Master Edition verificable en [Solscan](https://solscan.io/?cluster=devnet).

---

## 🏗 Arquitectura

```
┌─────────────────────────────────┐
│         Frontend (React)        │
│   page.tsx – UI principal       │
│   · Conexión Wallet (Phantom)   │
│   · Input de prompt             │
│   · Indicador de progreso       │
│   · Tarjeta de resultado        │
└──────────┬──────────────────────┘
           │  POST /api/generate
           ▼
┌─────────────────────────────────┐
│      API Route (Server-side)    │
│   route.ts                      │
│   · Genera imagen con DALL-E 3  │
│   · Descarga imagen a memoria   │
│   · Sube imagen a Pinata (IPFS) │
│   · Crea metadata JSON          │
│   · Sube metadata a IPFS        │
│   · Retorna metadataUrl         │
└──────────┬──────────────────────┘
           │  metadataUrl
           ▼
┌─────────────────────────────────┐
│      Mint Logic (Client-side)   │
│   mintLogic.ts                  │
│   · Bridge Phantom → Metaplex   │
│   · Crea NFT Master Edition     │
│   · Firma con Phantom wallet    │
│   · Retorna mintAddress         │
└─────────────────────────────────┘
```

---

## 🛠 Tecnologías

| Categoría       | Tecnología                           | Versión   |
|-----------------|--------------------------------------|-----------|
| **Framework**   | Next.js (App Router)                 | 16.1.5    |
| **Lenguaje**    | TypeScript                           | 5.x       |
| **UI/CSS**      | Tailwind CSS                         | 4.x       |
| **Blockchain**  | Solana (Devnet)                      | —         |
| **Wallet**      | Phantom (via `@solana/react-hooks`)  | —         |
| **NFT SDK**     | Metaplex Foundation JS SDK           | 0.20.1    |
| **IA**          | OpenAI DALL-E 3                      | —         |
| **Storage**     | Pinata (IPFS)                        | —         |
| **HTTP Client** | Axios                                | 1.13.x    |
| **Fonts**       | Inter, Geist Mono                    | —         |

---

## 📝 Requisitos Previos

- **Node.js** v18+ y **npm**
- **Phantom Wallet** instalada como extensión del navegador
- **API Key de OpenAI** con acceso a DALL-E 3
- **JWT de Pinata** para subir archivos a IPFS
- **SOL en Devnet** en tu wallet Phantom (para fees de minting)

> 💡 **Tip:** Puedes obtener SOL de prueba gratis en [Solana Faucet](https://faucet.solana.com/) seleccionando la red Devnet.

---

## ⚙️ Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/nft-prompter.git
cd nft-prompter

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
#    Copia .env.local.example a .env.local y completa tus keys
cp .env.local.example .env.local

# 4. Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000`.

---

## 🔐 Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

| Variable         | Descripción                                      | Ejemplo                        |
|------------------|--------------------------------------------------|--------------------------------|
| `OPENAI_API_KEY` | API Key de OpenAI con acceso a DALL-E 3          | `sk-proj-...`                  |
| `PINATA_JWT`     | JWT de autenticación de Pinata para subir a IPFS | `eyJhbGciOiJIUzI1NiIs...`     |

```env
OPENAI_API_KEY=sk-proj-tu-api-key-aqui
PINATA_JWT=tu-jwt-de-pinata-aqui
```

> ⚠️ **Importante:** Nunca subas tu `.env.local` al repositorio. Ya está incluido en `.gitignore`.

---

## 🎮 Uso

1. **Abre la app** en `http://localhost:3000`.
2. **Conecta tu Phantom Wallet** haciendo clic en "Conectar Phantom".
3. **Escribe un prompt** describiendo la imagen NFT que deseas.
   - Ejemplo: *"Guerrero azteca con armadura de luz neon en un templo futurista"*
4. **Haz clic en "⚡ Generar & Mintear NFT"**.
5. **Espera el proceso** (observa los pasos de progreso en pantalla):
   - 🎨 Generando imagen con DALL-E 3
   - 📦 Subiendo a IPFS
   - ⛏️ Minteando NFT en Solana
   - ✅ ¡NFT creado!
6. **Firma la transacción** cuando Phantom te lo solicite.
7. **¡Listo!** Verás tu NFT con un enlace directo a Solscan.

---

## 📁 Estructura del Proyecto

```
nft-prompter/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # API: DALL-E 3 + Pinata IPFS
│   ├── components/
│   │   └── providers.tsx         # SolanaProvider (Devnet client)
│   ├── utils/
│   │   └── mintLogic.ts          # Lógica de minting con Metaplex
│   ├── globals.css               # Tema dark cyberpunk + animaciones
│   ├── icon.svg                  # Favicon del sitio
│   ├── layout.tsx                # Layout raíz (fonts + providers)
│   └── page.tsx                  # Página principal (UI completa)
├── .env.local                    # Variables de entorno (no commitear)
├── .gitignore
├── .prettierrc                   # Configuración de Prettier
├── eslint.config.mjs             # Configuración de ESLint
├── next.config.ts                # Config de Next.js (ws externo)
├── og-image.png                  # Imagen Open Graph
├── package.json
├── postcss.config.mjs            # PostCSS (Tailwind)
└── tsconfig.json                 # Configuración de TypeScript
```

---

## 🔄 Flujo Técnico

### Paso 1 — Generación de Imagen y Metadata (Server-side)

El usuario envía un prompt al endpoint `POST /api/generate`:

1. **DALL-E 3** genera una imagen de 1024×1024 px a partir del prompt.
2. La imagen se descarga a memoria como `ArrayBuffer`.
3. Se sube la imagen a **Pinata IPFS** → se obtiene un `ipfsImageUrl`.
4. Se construye un objeto **metadata JSON** (estándar NFT):
   ```json
   {
     "name": "Hackathon AI Art",
     "symbol": "AINFT",
     "description": "el prompt del usuario",
     "image": "https://gateway.pinata.cloud/ipfs/Qm...",
     "attributes": [
       { "trait_type": "Generator", "value": "DALL-E 3" }
     ]
   }
   ```
5. Se sube la metadata a **Pinata IPFS** → se obtiene `metadataUrl`.
6. El API retorna `{ metadataUrl, ipfsImageUrl }`.

### Paso 2 — Minting del NFT (Client-side)

Con la `metadataUrl` recibida, el frontend ejecuta `mintAIgeneratedNFT()`:

1. Se crea un **bridge** entre `window.solana` (Phantom) y Metaplex Wallet Adapter.
2. Se inicializa **Metaplex** con conexión a Devnet e Irys Storage.
3. Se llama a `metaplex.nfts().create()` con:
   - `uri`: la metadataUrl de IPFS
   - `name`: primeros 32 caracteres del prompt
   - `sellerFeeBasisPoints`: 500 (5% royalties)
   - `maxSupply`: 0 (Master Edition — pieza única)
4. Phantom solicita al usuario **firmar la transacción**.
5. Se retorna `{ mintAddress, solscanUrl }`.

---

## 📡 API Reference

### `POST /api/generate`

Genera una imagen con IA y la sube a IPFS junto con su metadata.

**Request Body:**

```json
{
  "prompt": "Descripción de la imagen NFT"
}
```

**Response (200):**

```json
{
  "metadataUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
  "ipfsImageUrl": "https://gateway.pinata.cloud/ipfs/Qm..."
}
```

**Response (400):**

```json
{
  "error": "Falta el prompt"
}
```

**Response (500):**

```json
{
  "error": "Error procesando la IA y Storage"
}
```

---

## 📦 Módulos Principales

### `page.tsx` — Página Principal

La interfaz de usuario completa, implementada como un Client Component de React.

| Elemento               | Descripción                                                              |
|------------------------|--------------------------------------------------------------------------|
| **Wallet Section**     | Conectar/desconectar Phantom via `@solana/react-hooks`                   |
| **Prompt Input**       | Textarea para describir el NFT deseado                                   |
| **Progress Steps**     | 4 pasos visuales con estados: `pending`, `active`, `done`, `error`       |
| **Result Card**        | Muestra imagen generada, mint address, red y enlace a Solscan            |

### `route.ts` — API Route

Endpoint server-side que orquesta la generación de imagen y subida a IPFS.

| Servicio    | Acción                                     |
|-------------|---------------------------------------------|
| **OpenAI**  | Genera imagen 1024×1024 con DALL-E 3        |
| **Axios**   | Descarga la imagen generada a memoria       |
| **Pinata**  | Sube imagen y metadata JSON a IPFS          |

### `mintLogic.ts` — Lógica de Minting

Módulo client-side que ejecuta el minting on-chain.

| Función                     | Descripción                                         |
|-----------------------------|-----------------------------------------------------|
| `getPhantomWalletAdapter()` | Bridge entre `window.solana` y Metaplex Wallet       |
| `mintAIgeneratedNFT()`      | Mintea un NFT Master Edition en Solana Devnet         |

### `providers.tsx` — Providers de Solana

Configura el `SolanaProvider` con un cliente apuntando a `https://api.devnet.solana.com` y auto-discovery de wallet connectors.

---

## 🎨 Diseño y Tema

La app utiliza un tema **Dark Cyberpunk** con las siguientes características:

| Elemento           | Detalle                                                      |
|--------------------|--------------------------------------------------------------|
| **Fondo**          | `#0a0a12` con grid sutil en púrpura                          |
| **Colores accent** | Púrpura `#8b5cf6`, Cyan `#06b6d4`, Rosa `#ec4899`           |
| **Cards**          | Glassmorphism con `backdrop-filter: blur(16px)`              |
| **Gradientes**     | Púrpura → Cyan (main), Púrpura → Rosa (hot)                 |
| **Tipografía**     | Inter (sans), Geist Mono (mono)                              |

### Animaciones CSS

| Animación             | Uso                                             |
|-----------------------|-------------------------------------------------|
| `pulse-glow`          | Glow pulsante en la tarjeta de resultado         |
| `shimmer`             | Efecto shimmer para elementos de carga           |
| `float`               | Movimiento flotante suave                        |
| `fade-in-up`          | Entrada con fade desde abajo                     |
| `spin-slow`           | Spinner de carga                                 |
| `progress-pulse`      | Pulso en pasos activos del progreso              |

---

## 📜 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Iniciar build de producción
npm run lint         # Ejecutar ESLint
npm run format       # Formatear código con Prettier
npm run format:check # Verificar formato sin cambios
npm run ci           # Build + lint + format check
```

---

## 🔗 Enlaces Útiles

- [Solana Devnet Faucet](https://faucet.solana.com/) — Obtener SOL de prueba
- [Solscan Devnet](https://solscan.io/?cluster=devnet) — Explorador de bloques
- [OpenAI API](https://platform.openai.com/) — Documentación de DALL-E
- [Pinata Cloud](https://www.pinata.cloud/) — Servicio de IPFS
- [Metaplex Docs](https://docs.metaplex.com/) — SDK de NFTs en Solana
- [Phantom Wallet](https://phantom.app/) — Wallet de Solana

---

<p align="center">
  <strong>Hackathon Project</strong> · Powered by DALL-E 3, Solana & Metaplex ⚡
</p>
