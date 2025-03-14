import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
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

    // Используем более новую модель Stable Diffusion с актуальным ID
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: prompt,
          negative_prompt: "poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, blurry, out of focus",
          width: 768,
          height: 768,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          scheduler: "K_EULER",
          num_outputs: 1
        }
      }
    );

    // Лог для отладки
    console.log("Replicate response:", output);

    // Первая URL - это сгенерированное изображение
    const imageUrl = Array.isArray(output) ? output[0] : null;

    if (!imageUrl) {
      throw new Error('Не удалось получить URL изображения');
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    // Подробный вывод ошибки
    console.error('Error generating image:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response body:', await error.response.text().catch(() => 'Could not read body'));
    }
    
    return NextResponse.json(
      { error: 'Не удалось сгенерировать изображение', details: error.message },
      { status: 500 }
    );
  }
} 