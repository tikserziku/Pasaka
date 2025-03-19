import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Базовая проверка окружения для определения режима работы
const isVercelOrNetlify = 
  process.env.VERCEL || 
  process.env.NETLIFY || 
  process.env.NETLIFY_LOCAL;

// Функция для создания OpenAI клиента с учетом различных окружений
function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || '';
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY не настроен');
    throw new Error('API key is not configured');
  }
  
  return new OpenAI({
    apiKey,
    maxRetries: 2, // Увеличиваем число повторных попыток
    timeout: 60000  // Увеличиваем таймаут до 60 секунд
  });
}

export async function POST(req: Request) {
  try {
    // Проверяем наличие API ключа
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY не найден в переменных окружения');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }

    // Получаем параметры запроса
    let requestData: { prompt: string; style?: string; quality?: string; size?: string };
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('Ошибка при разборе JSON:', error);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { prompt, style = 'vivid', quality = 'standard', size = '1024x1024' } = requestData;

    // Проверяем наличие промпта
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error('Отсутствует или некорректный промпт в запросе');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log("Запрос на генерацию изображения:", prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

    // Улучшаем промпт для детских иллюстраций, если это еще не сделано
    const enhancedPrompt = prompt.toLowerCase().includes('детск') || prompt.toLowerCase().includes('книж')
      ? prompt
      : `${prompt} Иллюстрация в стиле детских книг, высокое качество, акварельная техника, яркие чистые цвета, четкие детали, профессиональная художественная детализация. БЕЗ ТЕКСТА НА ИЗОБРАЖЕНИИ.`;

    const openai = createOpenAIClient();

    // Используем OpenAI DALL-E для генерации изображений
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: size as "1024x1024" | "1792x1024" | "1024x1792",
        quality: quality as "standard" | "hd",
        style: style as "vivid" | "natural"
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
        throw new Error('Не удалось получить URL изображения');
      }

      console.log("OpenAI успешно сгенерировал изображение");

      return NextResponse.json({ imageUrl });
    } catch (error: any) {
      console.error('Ошибка при генерации изображения с DALL-E 3:', error);
      
      // Пробуем резервный вариант с DALL-E 2, если основной не сработал
      try {
        console.log("Пробуем резервный вариант с DALL-E 2...");
        const fallbackResponse = await openai.images.generate({
          model: "dall-e-2",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
        });

        const fallbackImageUrl = fallbackResponse.data[0]?.url;
        
        if (!fallbackImageUrl) {
          throw new Error('Не удалось получить URL изображения и при резервном варианте');
        }
        
        console.log("Резервный вариант с DALL-E 2 сработал успешно");
        return NextResponse.json({ imageUrl: fallbackImageUrl });
      } catch (fallbackError: any) {
        console.error('Ошибка при генерации резервного изображения:', fallbackError);
        throw error; // Выбрасываем изначальную ошибку
      }
    }
  } catch (error: any) {
    // Подробный вывод ошибки
    console.error('Ошибка при генерации изображения:', error);
    
    // Определяем статус ошибки
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        error: 'Не удалось сгенерировать изображение', 
        details: errorMessage,
        // Добавляем информацию о том, что это серверная ошибка, чтобы клиент мог принять решение о повторной попытке
        isServerError: statusCode >= 500
      },
      { status: statusCode }
    );
  }
}
