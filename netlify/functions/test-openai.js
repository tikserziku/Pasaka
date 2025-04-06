// Файл netlify/functions/test-openai.js
const { OpenAI } = require('openai');

exports.handler = async function() {
  try {
    // Проверяем наличие API-ключа
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false,
          error: 'OPENAI_API_KEY не найден в переменных окружения',
          envVars: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY') && !key.includes('TOKEN'))
        })
      };
    }

    // Проверяем первые несколько символов ключа для подтверждения формата
    const keyFormat = apiKey.startsWith('sk-') ? 'верный формат (начинается с sk-)' : 'неверный формат';

    // Пробуем инициализировать клиент OpenAI
    const openai = new OpenAI({ 
      apiKey,
      maxRetries: 1,
      timeout: 10000
    });

    // Делаем простой запрос для проверки подключения
    const modelList = await openai.models.list();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Подключение к OpenAI API успешно проверено',
        apiKeyFormat: keyFormat,
        modelsCount: modelList.data.length,
        firstFewModels: modelList.data.slice(0, 3).map(model => model.id)
      })
    };
  } catch (error) {
    console.error('Ошибка при проверке OpenAI API:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Ошибка при проверке OpenAI API',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
