import { NextResponse } from 'next/server';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { createOpenAIClient, API_CONFIG } from '@/lib/api/api-config';

export const runtime = "edge"; // Используем Edge Runtime для лучшей производительности
export const maxDuration = 60; // Максимальная длительность в секундах (для Netlify Edge Functions)

export async function POST(req: Request) {
  try {
    // Проверяем наличие API ключа
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }

    // Получаем данные запроса
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty messages array' },
        { status: 400 }
      );
    }

    // Создаем экземпляр OpenAI API клиента
    const openai = createOpenAIClient();
    
    // Создаем поток ответа от OpenAI
    const response = await openai.chat.completions.create({
      model: API_CONFIG.openai.models.chat,
      stream: true,
      messages: messages,
      temperature: 0.8, // Немного повышаем креативность для сказок
      max_tokens: 2000, // Увеличиваем лимит для длинных сказок
    });
    
    // Создаем поток для ответа
    const stream = OpenAIStream(response);
    
    // Возвращаем стриминг-ответ
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error('Error in OpenAI chat API:', error);
    
    // Возвращаем понятную ошибку с учетом специфики Netlify
    return NextResponse.json(
      { 
        error: 'Failed to generate story',
        details: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}
