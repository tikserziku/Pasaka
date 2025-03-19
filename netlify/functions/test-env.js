exports.handler = async function() {
  return {
    statusCode: 200,
    body: JSON.stringify({
      hasApiKey: !!process.env.OPENAI_API_KEY,
      // НЕ возвращайте сам ключ!
      keyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 3) : null,
      env: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY'))
    })
  };
};
