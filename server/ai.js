import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("⚠️ GEMINI_API_KEY não está configurada no arquivo .env");
}

export async function analyzeCleaningTask(base64Image, textPrompt, history = []) {
    if (!ai) {
        throw new Error("A API do Gemini não está configurada. Adicione a GEMINI_API_KEY no arquivo .env.");
    }
    
    const systemInstruction = `Você é um assistente técnico e comercial especialista em higienização de estofados. O usuário enviará uma foto do móvel e os produtos disponíveis. Sua resposta deve ser direta e focada na ação.

Regras:
1. Não faça saudações longas.
2. Dê a diluição exata em mililitros (mL) para 1 Litro de água, sem faixas de variação.
3. Use bullet points curtos para o passo a passo.
4. Se o usuário perguntar sobre preços ou orçamentos, sugira um valor médio cobrado no mercado brasileiro (em Reais - R$) baseado no tamanho e sujidade do móvel (ex: Sofá retrátil 3 lugares: R$ 250 a R$ 350).
5. Ensine de verdade o técnico a fazer todo o trabalho de forma sequencial (ex: aspiração, pré-lavagem, escovação, extração, enxágue e neutralização).
6. Responda usando formatação em Markdown (negrito para alertas, listas).`;
    
    try {
        let contents = [];
        
        // If image is provided, format it for Gemini GenAI SDK
        if (base64Image) {
            let mimeType = 'image/jpeg';
            const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9+-.]+);base64,/);
            if (mimeMatch) {
                mimeType = mimeMatch[1];
            }
            const base64Data = base64Image.split(',')[1] || base64Image;
            
            contents.push({
                role: 'user',
                parts: [{
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }]
            });
        }
        
        // Add text prompt to the last user message or create a new one
        if (textPrompt) {
            if (base64Image) {
                 contents[0].parts.push({ text: textPrompt });
            } else {
                 contents.push({ role: 'user', parts: [{ text: textPrompt }] });
            }
        } else if (base64Image) {
            contents[0].parts.push({ text: "Analise esta imagem e me dê instruções de como limpar e quais produtos profissionais usar." });
        }

        // Format history for Gemini API
        // Gemini expects: { role: 'user'|'model', parts: [{ text: '...' }] }
        // Include images from history so the AI remembers what was sent before
        let geminiHistory = history.map(msg => {
            const parts = [];
            
            // If the history message has an image, include it as inlineData
            if (msg.image) {
                let imgMime = 'image/jpeg';
                const mMatch = msg.image.match(/^data:(image\/[a-zA-Z0-9+-.]+);base64,/);
                if (mMatch) imgMime = mMatch[1];
                const imgData = msg.image.split(',')[1] || msg.image;
                parts.push({
                    inlineData: {
                        data: imgData,
                        mimeType: imgMime
                    }
                });
            }
            
            // Always include the text part
            if (msg.text) {
                parts.push({ text: msg.text });
            }
            
            // Ensure at least one part exists
            if (parts.length === 0) {
                parts.push({ text: '(mensagem sem conteúdo)' });
            }
            
            return {
                role: msg.role === 'ai' ? 'model' : 'user',
                parts
            };
        });
        
        // Append current prompt
        const finalContents = [...geminiHistory, ...contents];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalContents,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        
        return response.text;
    } catch (error) {
        console.error("Erro no Gemini API:", error);
        throw new Error("Falha ao analisar com a IA: " + error.message, { cause: error });
    }
}
