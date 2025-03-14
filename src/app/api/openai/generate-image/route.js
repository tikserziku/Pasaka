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
        { error: 'Ошибка конфигурации API' },
        { status: 500 }
      );
    }

    // Инициализируем клиент OpenAI с явным указанием ключа
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const body = await request.json();
    const { prompt } = body;

    // Остальной код для генерации изображения...
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    return NextResponse.json({ imageUrl: response.data[0].url });
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    return NextResponse.json(
      { error: 'Не удалось сгенерировать изображение' },
      { status: 500 }
    );
  }
}