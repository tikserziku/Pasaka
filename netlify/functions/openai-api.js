// Файл netlify/functions/openai-api.js
const { OpenAI } = require('openai');

// Настройки для разных типов запросов OpenAI
const OPENAI_CONFIGS = {
  chat: {
    model: 'gpt-3.5-turbo',
    temperature: 0.8,
    max_tokens: 1500,
    timeout: 25000
  },
  imageGeneration: {
    model: 'dall-e-3', // Переключаемся на DALL-E 3 для лучшего качества
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid'
  },
  textToSpeech: {
    model: 'tts-1',
    voice: 'alloy'
  }
};

exports.handler = async function(event, context) {
  // Активируем режим отладки
  console.log('Запрос получен:', event.path);
  console.log('Query параметры:', event.queryStringParameters);
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY не найден в переменных окружения');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is not configured' })
    };
  }
  
  // Инициализируем OpenAI клиент с таймаутом
  const openai = new OpenAI({ 
    apiKey,
    maxRetries: 2, // Увеличиваем количество повторных попыток
    timeout: 30000 // Увеличиваем таймаут до 30 секунд
  });
  
  try {
    // Определяем тип операции из query параметров или из пути
    let operation = '';
    
    // Первый способ: проверяем query параметр path, если он есть
    if (event.queryStringParameters && event.queryStringParameters.path) {
      operation = event.queryStringParameters.path;
      console.log('Операция определена из query параметра:', operation);
    } 
    // Второй способ: проверяем из последней части пути
    else {
      const pathParts = event.path.split('/');
      operation = pathParts[pathParts.length - 1];
      console.log('Операция определена из пути:', operation);
    }
    
    // Проверяем, соответствует ли операция известным типам
    if (operation !== 'chat' && operation !== 'generate-image' && operation !== 'text-to-speech') {
      // Проверяем, есть ли эти ключевые слова в пути
      if (event.path.includes('/chat')) {
        operation = 'chat';
      } else if (event.path.includes('/generate-image')) {
        operation = 'generate-image';
      } else if (event.path.includes('/text-to-speech')) {
        operation = 'text-to-speech';
      } else {
        return {
          statusCode: 404,
          body: JSON.stringify({ 
            error: 'Unknown API endpoint', 
            path: event.path,
            operation: operation
          })
        };
      }
      console.log('Операция определена из пути (fallback):', operation);
    }
    
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
    
    // Обрабатываем разные типы запросов
    console.log('Начинаем обработку запроса типа:', operation);
    
    // Используем операцию для выбора правильного обработчика
    if (operation === 'chat') {
      return await handleChatRequest(openai, requestBody);
    } else if (operation === 'generate-image') {
      return await handleImageRequest(openai, requestBody);
    } else if (operation === 'text-to-speech') {
      return await handleTextToSpeechRequest(openai, requestBody);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Unknown API endpoint' })
      };
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error processing request',
        details: error.message || 'Unknown error'
      })
    };
  }
};

// Обработчик для запросов чата
async function handleChatRequest(openai, requestBody) {
  console.log('Обработка запроса чата...');
  const { messages } = requestBody;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error('Некорректный формат сообщений');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or empty messages array' })
    };
  }
  
  try {
    console.log('Отправка запроса к OpenAI API...');
    const startTime = Date.now();
    
    const config = OPENAI_CONFIGS.chat;
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens
    });
    
    const endTime = Date.now();
    console.log(`Ответ получен за ${endTime - startTime}мс`);
    
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Ошибка в запросе чата:', error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({
        error: 'Error generating chat response',
        details: error.message || 'Unknown error'
      })
    };
  }
}

// Обработчик для запросов генерации изображений
async function handleImageRequest(openai, requestBody) {
  console.log('Обработка запроса генерации изображения...');
  const { prompt } = requestBody;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.error('Некорректный промпт');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or empty prompt' })
    };
  }
  
  try {
    console.log('Отправка запроса генерации изображения к OpenAI API...');
    console.log('Промпт:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    const startTime = Date.now();
    
    const config = OPENAI_CONFIGS.imageGeneration;
    const response = await openai.images.generate({
      model: config.model,
      prompt: prompt,
      n: 1,
      size: requestBody.size || config.size,
      quality: requestBody.quality || config.quality,
      style: requestBody.style || config.style
    });
    
    const endTime = Date.now();
    console.log(`Изображение сгенерировано за ${endTime - startTime}мс`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrl: response.data[0]?.url })
    };
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    
    // Если не удалось использовать DALL-E 3, попробуем DALL-E 2
    if (OPENAI_CONFIGS.imageGeneration.model === 'dall-e-3') {
      try {
        console.log('Повторная попытка с использованием DALL-E 2...');
        const fallbackResponse = await openai.images.generate({
          model: 'dall-e-2',
          prompt: prompt,
          n: 1,
          size: '1024x1024'
        });
        
        return {
          statusCode: 200,
          body: JSON.stringify({ imageUrl: fallbackResponse.data[0]?.url })
        };
      } catch (fallbackError) {
        console.error('Ошибка при резервной генерации изображения:', fallbackError);
      }
    }
    
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({
        error: 'Error generating image',
        details: error.message || 'Unknown error'
      })
    };
  }
}

// Обработчик для запросов text-to-speech
async function handleTextToSpeechRequest(openai, requestBody) {
  console.log('Обработка запроса преобразования текста в речь...');
  const { text, voice } = requestBody;
  
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('Некорректный текст');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or empty text' })
    };
  }
  
  try {
    console.log('Отправка запроса text-to-speech к OpenAI API...');
    const startTime = Date.now();
    
    // Ограничение длины текста для API
    const maxLength = 4000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "... (текст был сокращен для озвучивания)"
      : text;
    
    const config = OPENAI_CONFIGS.textToSpeech;
    const mp3 = await openai.audio.speech.create({
      model: config.model,
      voice: voice || config.voice,
      input: truncatedText
    });
    
    const endTime = Date.now();
    console.log(`Аудио создано за ${endTime - startTime}мс`);
    
    // Для аудио нам нужно преобразовать ответ в формат base64
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const base64Audio = buffer.toString('base64');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        audio: base64Audio,
        format: 'mp3' 
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      isBase64Encoded: false
    };
  } catch (error) {
    console.error('Ошибка при генерации речи:', error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({
        error: 'Error generating speech',
        details: error.message || 'Unknown error'
      })
    };
  }
}
