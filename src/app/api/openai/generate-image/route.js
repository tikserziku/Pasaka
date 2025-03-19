import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Инициализируем API-клиент OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request) {
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
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Не удалось разобрать тело запроса:', parseError);
      return NextResponse.json(
        { error: 'Некорректный формат запроса' },
        { status: 400 }
      );
    }

    const { prompt } = body;

    // Валидация промпта
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error('Отсутствует или некорректный промпт в запросе');
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
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      throw new Error('Не удалось получить URL изображения');
    }

    console.log("OpenAI успешно сгенерировал изображение");

    return NextResponse.json({ imageUrl });
  } catch (error) {
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
