// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import FormData from 'form-data';

// Inicializamos OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Falta el prompt' }, { status: 400 });
    }

    console.log("1. Llamando a DALL-E 3...");
    const aiResponse = await openai.images.generate({
      model: "dall-e-3", // Puedes cambiar a dall-e-2 si quieres que sea más rápido/barato en el hackathon
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });
    
    const imageUrl = aiResponse.data[0].url;
    if (!imageUrl) throw new Error("No se pudo generar la imagen");

    console.log("2. Descargando imagen a memoria...");
    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imgRes.data, 'binary');

    console.log("3. Subiendo imagen a Pinata (IPFS)...");
    const formData = new FormData();
    formData.append('file', buffer, { filename: 'nft-art.png' });

    const pinataImgRes = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
        ...formData.getHeaders()
      }
    });
    
    const ipfsImageUrl = `https://gateway.pinata.cloud/ipfs/${pinataImgRes.data.IpfsHash}`;

    console.log("4. Creando y subiendo Metadata JSON...");
    const metadata = {
      name: "Hackathon AI Art",
      symbol: "AINFT",
      description: prompt,
      image: ipfsImageUrl,
      attributes: [
        { trait_type: "Generator", value: "DALL-E 3" }
      ]
    };

    const pinataJsonRes = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
        'Content-Type': 'application/json'
      }
    });

    const metadataUrl = `https://gateway.pinata.cloud/ipfs/${pinataJsonRes.data.IpfsHash}`;
    console.log("✅ ÉXITO. URL del JSON:", metadataUrl);

    // Entregamos el resultado final a la Persona A y C
    return NextResponse.json({ metadataUrl });

  } catch (error: any) {
    console.error("Error en la máquina de IA:", error.message || error);
    return NextResponse.json({ error: 'Error procesando la IA y Storage' }, { status: 500 });
  }
}