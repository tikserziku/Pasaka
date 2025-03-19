import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Инициализируем API клиент OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Допустимые голоса для API OpenAI TTS
type VoiceType = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// Максимальная длина текста для API
const MAX_TEXT_LENGTH = 4096;

// Проверка валидности текста
function validateText(text: string): boolean {
  return Boolean(text && text.trim().length > 0);
}

// Проверка валидности голоса
function validateVoice(voice: string): boolean {
  const validVoices: VoiceType[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  return validVoices.includes(voice as VoiceType);
}

// Проверка, является ли среда Netlify
const isNetlify = process.env.NETLIFY || process.env.NETLIFY_LOCAL;

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
    let data;
    try {
      data = await req.json();
    } catch (error) {
      console.error('Ошибка при разборе JSON запроса:', error);
      return NextResponse.json(
        { error: 'Некорректный формат запроса' },
        { status: 400 }
      );
    }
    
    const { text, voice = 'alloy' } = data;

    // Валидируем текст
    if (!validateText(text)) {
      return NextResponse.json(
        { error: 'Текст не предоставлен или пустой' },
        { status: 400 }
      );
    }

    // Валидируем голос
    if (!validateVoice(voice)) {
      return NextResponse.json(
        { error: 'Некорректный тип голоса' },
        { status: 400 }
      );
    }

    // Ограничиваем длину текста для API
    const truncatedText = text.length > MAX_TEXT_LENGTH 
      ? text.substring(0, MAX_TEXT_LENGTH) + "... (текст был сокращен для озвучивания)"
      : text;

    console.log(`Запрос на преобразование текста в речь, длина: ${truncatedText.length}, голос: ${voice}`);

    // Создаем аудио с помощью OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as VoiceType,
      input: truncatedText,
      speed: 1.0, // Стандартная скорость речи
    });

    // Для Netlify функций мы должны возвращать аудио как base64
    if (isNetlify) {
      const buffer = await mp3.arrayBuffer();
      const base64Audio = Buffer.from(buffer).toString('base64');
      
      console.log(`Аудио успешно создано, размер: ${buffer.byteLength} байт`);
      
      return NextResponse.json({
        audio: base64Audio,
        format: 'mp3',
        size: buffer.byteLength
      });
    } else {
      // Для стандартной Next.js среды возвращаем аудио напрямую
      const buffer = await mp3.arrayBuffer();
      
      console.log(`Аудио успешно создано, размер: ${buffer.byteLength} байт`);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=31536000', // Кэширование на год
        },
      });
    }
  } catch (error: any) {
    console.error('Ошибка при создании аудио:', error);
    
    // Определяем тип ошибки и формируем соответствующий ответ
    if (error.response) {
      // Ошибка API OpenAI
      const statusCode = error.response.status || 500;
      const errorMessage = error.response.data?.error?.message || error.message;
      
      return NextResponse.json(
        { 
          error: 'Ошибка API OpenAI TTS', 
          details: errorMessage
        },
        { status: statusCode }
      );
    } else {
      // Другие ошибки
      return NextResponse.json(
        { 
          error: 'Не удалось создать аудио', 
          details: error.message || 'Неизвестная ошибка'
        },
        { status: 500 }
      );
    }
  }
}
