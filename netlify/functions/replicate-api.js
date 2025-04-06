// Файл netlify/functions/replicate-api.js
const Replicate = require('replicate');

exports.handler = async function(event, context) {
  console.log('Запрос получен:', event.path);
  console.log('HTTP метод:', event.httpMethod);
  
  // Ограничиваем время выполнения функции
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Проверяем метод запроса
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  // Проверяем API-ключ
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    console.error('REPLICATE_API_TOKEN не найден в переменных окружения');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API token is not configured' })
    };
  }
  
  // Инициализируем Replicate клиент
  const replicate = new Replicate({
    auth: apiToken
  });
  
  try {
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      console.log('Тело запроса получено и успешно разобрано');
    } catch (e) {
      console.error('Ошибка при парсинге тела запроса:', e);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }
    
    // Получаем промпт для генерации изображения
    const { prompt, negative_prompt } = requestBody;
    
    if (!prompt || typeof prompt !== 'string') {
      console.error('Некорректный промпт');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid or empty prompt' })
      };
    }
    
    console.log('Начинаем генерацию изображения с Replicate...');
    console.log('Промпт:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    
    // Используем Stable Diffusion SDXL
    const modelId = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
    const startTime = Date.now();
    
    // Запускаем генерацию изображения
    const output = await replicate.run(modelId, {
      input: {
        prompt: prompt,
        negative_prompt: negative_prompt || "poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, blurry, out of focus",
        width: 768,
        height: 768,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        scheduler: "K_EULER",
        num_outputs: 1
      }
    });
    
    const endTime = Date.now();
    console.log(`Изображение сгенерировано за ${endTime - startTime}мс`);
    
    // Проверяем, что получили URL изображения
    if (!output || (Array.isArray(output) && output.length === 0)) {
      throw new Error('Не удалось получить URL изображения от Replicate');
    }
    
    // Возвращаем URL сгенерированного изображения
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        output: output,
        imageUrl: Array.isArray(output) ? output[0] : output
      })
    };
  } catch (error) {
    console.error('Ошибка при генерации изображения с Replicate:', error);
    
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({
        error: 'Ошибка при генерации изображения',
        details: error.message || 'Неизвестная ошибка'
      })
    };
  }
};
