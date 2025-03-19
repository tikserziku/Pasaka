import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic"; // Отключаем кеширование для этого маршрута

// Функция для проверки доступности API
async function checkApiEndpoint(url: string): Promise<{ isAvailable: boolean; statusCode?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    return {
      isAvailable: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    console.error(`Ошибка при проверке API ${url}:`, error);
    return { isAvailable: false };
  }
}

export async function GET() {
  // Проверяем наличие ключей API
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const hasReplicateToken = Boolean(process.env.REPLICATE_API_TOKEN);
  const hasDeepgramKey = Boolean(process.env.DEEPGRAM_API_KEY);
  
  // Информация о среде выполнения
  const environment = {
    isVercel: Boolean(process.env.VERCEL),
    isNetlify: Boolean(process.env.NETLIFY || process.env.NETLIFY_LOCAL),
    nodeEnv: process.env.NODE_ENV || 'unknown',
    runtime: process.env.NEXT_RUNTIME || 'unknown',
  };
  
  // Проверяем доступность основных API маршрутов
  const apiStatus = {
    openaiChat: await checkApiEndpoint('/api/openai/chat'),
    openaiImage: await checkApiEndpoint('/api/openai/generate-image'),
    openaiTts: await checkApiEndpoint('/api/openai/text-to-speech'),
    replicate: await checkApiEndpoint('/api/replicate/generate-image'),
  };
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    keysConfigured: {
      openai: hasOpenAiKey,
      replicate: hasReplicateToken,
      deepgram: hasDeepgramKey,
    },
    environment,
    apiStatus,
    // Не возвращаем сами ключи по соображениям безопасности!
  });
}
