// Файл netlify/functions/openai-api.js
// Это бессерверная функция Netlify для работы с OpenAI API
const { OpenAI } = require('openai');

// Настройки для разных типов запросов OpenAI
const OPENAI_CONFIGS = {
  chat: {
    model: 'gpt-4o',
    temperature: 0.8,
    max_tokens: 2000
  },
  imageGeneration: {
    model: 'dall-e-3',
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is not configured' })
    };
  }
  
  // Инициализируем OpenAI клиент
  const openai = new OpenAI({ apiKey });
  
  try {
    // Парсим путь запроса, чтобы определить тип операции
    const path = event.path.split('/').pop();
    const requestBody = JSON.parse(event.body);
    
    // Обрабатываем разные типы запросов
    switch (path) {
      case 'chat':
        return handleChatRequest(openai, requestBody);
      case 'generate-image':
        return handleImageRequest(openai, requestBody);
      case 'text-to-speech':
        return handleTextToSpeechRequest(openai, requestBody);
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Unknown API endpoint' })
        };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
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
  const { messages } = requestBody;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or empty messages array' })
    };
  }
  
  try {
    const config = OPENAI_CONFIGS.chat;
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in chat request:', error);
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
  const { prompt, size, quality, style } = requestBody;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or empty prompt' })
    };
  }
  
  try {
    const config = OPENAI_CONFIGS.imageGeneration;
    const response = await openai.images.generate({
      model: config.model,
      prompt: prompt,
      n: 1,
      size: size || config.size,
      quality: quality || config.quality,
      style: style || config.style
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrl: response.data[0]?.url })
    };
  } catch (error) {
    console.error('Error generating image:', error);
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
  const { text, voice } = requestBody;
  
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid or empty text' })
    };
  }
  
  try {
    const config = OPENAI_CONFIGS.textToSpeech;
    const mp3 = await openai.audio.speech.create({
      model: config.model,
      voice: voice || config.voice,
      input: text
    });
    
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
    console.error('Error generating speech:', error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({
        error: 'Error generating speech',
        details: error.message || 'Unknown error'
      })
    };
  }
}
