import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Инициализируем API-клиент OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Валидация промпта
function validatePrompt(prompt: string): boolean {
  return prompt && prompt.trim().length > 0 && prompt.length < 4000;
}

// Настройки для генерации изображений
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "standard";
const DEFAULT_STYLE = "vivid";

export async function POST(req: Request) {
  try {
    // Проверяем наличие API-ключа
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY не найден в переменных окружения');
      return NextResponse.json(
        { error: 'Ошибка конфигурации API: отсутствует API-ключ' },
        { status: 500 }
      );
    }

    // Получаем данные запроса
    const data = await req.json();
    const { prompt, size = DEFAULT_SIZE, style = DEFAULT_STYLE, quality = DEFAULT_QUALITY } = data;

    // Валидируем промпт
    if (!validatePrompt(prompt)) {
      return NextResponse.json(
        { error: 'Запрос для генерации изображения некорректен или отсутствует' },
        { status: 400 }
      );
    }

    console.log("Запрос на генерацию изображения:", prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

    // Улучшаем промпт для детских иллюстраций, если это еще не сделано
    const enhancedPrompt = prompt.toLowerCase().includes('детск') || prompt.toLowerCase().includes('книж')
      ? prompt
      : `${prompt} Иллюстрация в стиле детских книг, высокое качество, акварельная техника, яркие чистые цвета, четкие детали, профессиональная художественная детализация. БЕЗ ТЕКСТА НА ИЗОБРАЖЕНИИ.`;
    
    // Используем OpenAI DALL-E для генерации изображений
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: size as "1024x1024" | "1792x1024" | "1024x1792",
      quality: quality as "standard" | "hd",
      style: style as "vivid" | "natural",
    });

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      throw new Error('Не удалось получить URL изображения');
    }

    console.log("OpenAI успешно сгенерировал изображение");

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    // Подробный вывод ошибки
    console.error('Ошибка при генерации изображения:', error);
    
    // Определяем тип ошибки и формируем соответствующий ответ
    if (error.response) {
      // Ошибка API OpenAI
      const statusCode = error.response.status || 500;
      const errorMessage = error.response.data?.error?.message || error.message;
      
      return NextResponse.json(
        { 
          error: 'Ошибка API OpenAI', 
          details: errorMessage
        },
        { status: statusCode }
      );
    } else {
      // Другие ошибки
      return NextResponse.json(
        { 
          error: 'Не удалось сгенерировать изображение', 
          details: error.message || 'Неизвестная ошибка'
        },
        { status: 500 }
      );
    }
  }
}
