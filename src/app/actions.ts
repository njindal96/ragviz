'use server';

import { generateWithFailover, GEMINI_CANDIDATES } from '@/lib/gemini-service';
import { CloudAISingleton } from '@/lib/ai-instances';

export async function parsePdfAction(formData: FormData): Promise<string> {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file uploaded');

  const buffer = Buffer.from(await file.arrayBuffer());

  // Use dynamic import to avoid build-time bundling issues with pdf-parse
  // which can have issues with some Next.js/Webpack configurations
  const { PDFParse } = await import('pdf-parse');

  // Debug logs
  console.log('[Server] Parsing PDF, buffer size:', buffer.length);
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  await parser.destroy();
  console.log('[Server] Extracted text length:', data.text.length);
  return data.text;
}

export async function generateAnswerAction(query: string, context: string) {
  const prompt = `
  You are a helpful assistant. Answer the question specifically using the provided context.
  If the answer is not in the context, say "I cannot find the answer in the document."
  
  Context:
  ${context}
  
  Question:
  ${query}
  `;

  try {
    const result = await generateWithFailover(prompt);
    if (result.error) {
      return {
        text: `❌ **Generation Error**\n\n${result.message}`,
        modelName: "Error"
      };
    }
    return result; // returning { text, modelName }
  } catch (error: any) {
    console.error('Gemini API Error (Unexpected):', error);
    return {
      text: "❌ **Generation Error**\n\nAn unexpected error occurred. Please try again later.",
      modelName: "Error"
    };
  }
}

export async function checkApiHealthAction() {
  try {
    const model = CloudAISingleton.getModel(GEMINI_CANDIDATES[0]);
    await model.generateContent("?");
    return { status: "OK" };
  } catch (error: any) {
    console.error("Health Check Failed:", error);
    return { status: "ERROR", message: error.message };
  }
}
