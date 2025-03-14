import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text, voice = 'alloy' } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Текст не предоставлен' },
        { status: 400 }
      );
    }

    // Ограничиваем длину текста, так как есть лимиты на API
    // Для больших текстов нужно разбивать на части и объединять аудио
    const maxLength = 4096;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "... (текст был сокращен для озвучивания)"
      : text;

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: truncatedText,
    });

    // Конвертируем в ArrayBuffer
    const buffer = await mp3.arrayBuffer();

    // Возвращаем как mp3 аудио
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Не удалось создать аудио' },
      { status: 500 }
    );
  }
} 