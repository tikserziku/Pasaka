import { useState } from 'react';
import Image from 'next/image';

interface ImageGeneratorProps {
  storyText: string;
}

export default function ImageGenerator({ storyText }: ImageGeneratorProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImages = async () => {
    if (!storyText || storyText.trim() === '') {
      setError('Сначала создайте сказку');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      
      // Делим сказку на три части для создания трех разных изображений
      const paragraphs = storyText.split('\n\n').filter(p => p.trim() !== '');
      
      // Создаём детализированные промпты на основе текста сказки
      // Выделяем ключевые элементы для каждой части сказки
      const kroliks = storyText.toLowerCase().includes('кролик') || storyText.toLowerCase().includes('нолик');
      const forestMagic = storyText.toLowerCase().includes('лес') || storyText.toLowerCase().includes('волшебн');
      const lake = storyText.toLowerCase().includes('озеро') || storyText.toLowerCase().includes('вода');
      const owl = storyText.toLowerCase().includes('сова') || storyText.toLowerCase().includes('офелия');
      
      let character = kroliks ? 'кролик Нолик с рыжевато-белым мехом' : 'главный герой сказки';
      let setting = forestMagic ? 'волшебный изумрудный лес' : 'сказочная страна';
      
      const prompts = [
        `Детская книжная иллюстрация: ${character} стоит в ${setting}. Сцена из начала сказки, яркие акварельные краски, стиль детских книг, дневной свет, красочная и детализированная иллюстрация.`,
        
        `Детская книжная иллюстрация: ${owl ? 'мудрая сова Офелия разговаривает с' : 'встреча'} ${character} в ${setting}. Средняя часть сказки, яркие акварельные краски, стиль детских книг, красочная и детализированная иллюстрация.`,
        
        `Детская книжная иллюстрация: ${character} ${lake ? 'возле волшебного озера, от которого исходит магическое сияние' : 'в кульминационный момент сказки'}. Финал сказки, яркие акварельные краски, стиль детских книг, волшебное свечение, красочная и детализированная иллюстрация.`
      ];

      const imageUrls: string[] = [];

      for (const prompt of prompts) {
        // Используем OpenAI для генерации изображений вместо Replicate
        const response = await fetch('/api/openai/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error('Не удалось сгенерировать изображение');
        }

        const data = await response.json();
        imageUrls.push(data.imageUrl);
      }

      setImages(imageUrls);
    } catch (err) {
      setError('Произошла ошибка при генерации изображений');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Иллюстрации к сказке</h2>
      
      <button
        onClick={generateImages}
        disabled={isGenerating || storyText.trim() === ''}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md 
                  disabled:bg-indigo-300 transition-colors mb-4"
      >
        {isGenerating ? 'Создание иллюстраций...' : 'Создать иллюстрации'}
      </button>
      
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {images.map((imageUrl, index) => (
          <div key={index} className="border rounded-lg overflow-hidden shadow-md">
            <Image 
              src={imageUrl} 
              alt={`Иллюстрация ${index + 1} к сказке`} 
              width={400} 
              height={400}
              className="w-full h-auto object-cover"
            />
          </div>
        ))}
        
        {isGenerating && (
          <>
            <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
              <div className="animate-pulse text-xl">Генерация...</div>
            </div>
            <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
              <div className="animate-pulse text-xl">Генерация...</div>
            </div>
            <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
              <div className="animate-pulse text-xl">Генерация...</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 