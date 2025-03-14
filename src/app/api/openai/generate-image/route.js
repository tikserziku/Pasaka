import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  try {
    // Явно получаем ключ API из переменных окружения
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Проверяем, что ключ API существует
    if (!apiKey) {
      console.error('OPENAI_API_KEY не найден в переменных окружения');
      return NextResponse.json(
        { error: 'Ошибка конфигурации API: отсутствует ключ API' },
        { status: 500 }
      );
    }

    // Инициализируем клиент OpenAI с явным указанием ключа
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      console.error('Отсутствует prompt в запросе');
      return NextResponse.json(
        { error: 'Отсутствует prompt в запросе' },
        { status: 400 }
      );
    }

    console.log('Отправка запроса в OpenAI с prompt:', prompt.substring(0, 50) + '...');

    // Остальной код для генерации изображения...
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    if (!response.data || !response.data[0] || !response.data[0].url) {
      console.error('Некорректный ответ от OpenAI:', JSON.stringify(response));
      return NextResponse.json(
        { error: 'Некорректный ответ от API' },
        { status: 500 }
      );
    }

    console.log('Успешно получен URL изображения от OpenAI');
    return NextResponse.json({ imageUrl: response.data[0].url });
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error.message);
    console.error('Полная ошибка:', error);
    
    // Возвращаем более подробную информацию об ошибке
    return NextResponse.json(
      { 
        error: 'Не удалось сгенерировать изображение', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}