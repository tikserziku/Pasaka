import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // Создаем поток из ответа OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: messages,
  });
  
  // Создаем поток для ответа
  const stream = OpenAIStream(response);
  
  // Возвращаем стриминг-ответ
  return new StreamingTextResponse(stream);
}
