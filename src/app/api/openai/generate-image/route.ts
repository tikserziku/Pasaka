import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Запрос для генерации изображения не предоставлен' },
        { status: 400 }
      );
    }

    console.log("Запрос на генерацию изображения:", prompt);

    // Улучшаем промпт для более точных детских иллюстраций
    const enhancedPrompt = `${prompt} Иллюстрация в стиле детских книг, высокое качество, акварельная техника, яркие чистые цвета, четкие детали, профессиональная художественная детализация. БЕЗ ТЕКСТА НА ИЗОБРАЖЕНИИ.`;
    
    // Используем OpenAI DALL-E для генерации изображений
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid", // Делаем изображения более яркими и выразительными
    });

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      throw new Error('Не удалось получить URL изображения');
    }

    // Лог для отладки
    console.log("OpenAI успешно сгенерировал изображение");

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    // Подробный вывод ошибки
    console.error('Error generating image:', error);
    
    return NextResponse.json(
      { error: 'Не удалось сгенерировать изображение', details: error.message },
      { status: 500 }
    );
  }
} 