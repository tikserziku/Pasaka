import { useState, useCallback } from 'react';
import { useChat } from 'ai/react';

interface FairyTaleGeneratorProps {
  onTaleGenerated: (tale: string) => void;
  onGenerating: () => void;
}

// Типы тем и длины сказок
type ThemeType = 'волшебная' | 'приключенческая' | 'фантастическая' | 'о животных' | 'о дружбе';
type LengthType = 'короткая' | 'средняя' | 'длинная';

// Варианты для выпадающих списков
const themeOptions: {value: ThemeType; label: string}[] = [
  { value: 'волшебная', label: 'Волшебная' },
  { value: 'приключенческая', label: 'Приключенческая' },
  { value: 'фантастическая', label: 'Фантастическая' },
  { value: 'о животных', label: 'О животных' },
  { value: 'о дружбе', label: 'О дружбе' }
];

const lengthOptions: {value: LengthType; label: string}[] = [
  { value: 'короткая', label: 'Короткая (1-2 минуты чтения)' },
  { value: 'средняя', label: 'Средняя (3-5 минут чтения)' },
  { value: 'длинная', label: 'Длинная (7-10 минут чтения)' }
];

export default function FairyTaleGenerator({ onTaleGenerated, onGenerating }: FairyTaleGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [theme, setTheme] = useState<ThemeType>('волшебная');
  const [length, setLength] = useState<LengthType>('короткая');
  const [error, setError] = useState<string | null>(null);

  const { append, isLoading } = useChat({
    api: '/api/openai/chat',
    onFinish: (message) => {
      if (message.content.trim().length > 0) {
        onTaleGenerated(message.content);
      } else {
        setError('Получена пустая сказка. Пожалуйста, попробуйте еще раз.');
      }
    },
    onError: (err) => {
      console.error('Ошибка при генерации сказки:', err);
      setError('Произошла ошибка при создании сказки. Пожалуйста, попробуйте еще раз.');
    }
  });

  const handleGenerateTale = useCallback(async () => {
    setError(null);
    onGenerating();
    
    // Создаем системный промпт с детальными инструкциями для AI
    const systemPrompt = `Ты волшебный рассказчик сказок. Создай ${length} сказку на ${theme} тему${prompt ? ` о ${prompt}` : ''}. 
    
    Правила для сказки:
    1. Сказка должна быть подходящей для детей от 4 до 10 лет
    2. Должна содержать четкое начало, середину и конец
    3. Иметь поучительный смысл или мораль
    4. Включать яркие описания мест, персонажей и событий
    5. Использовать простой и понятный язык
    6. Иметь 1-2 главных персонажа с именами
    7. Содержать несколько диалогов
    
    Оформляй текст в виде абзацев, выделяй диалоги. Используй яркие описания для возможности создания иллюстраций к сказке.
    
    Обязательно включи:
    - Яркое описание главного героя в начале сказки
    - Интересную встречу или событие в середине
    - Кульминационную сцену ближе к концу
    
    Пожалуйста, верни только текст сказки без дополнительных пояснений.`;
    
    await append({
      role: 'user',
      content: systemPrompt,
    });
  }, [append, length, theme, prompt, onGenerating]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Генератор сказок</h2>
      
      <div className="mb-4">
        <label htmlFor="theme-select" className="block text-sm font-medium text-gray-700 mb-1">
          Тема сказки:
        </label>
        <select 
          id="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeType)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          aria-label="Выберите тему сказки"
          disabled={isLoading}
        >
          {themeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label htmlFor="length-select" className="block text-sm font-medium text-gray-700 mb-1">
          Длина сказки:
        </label>
        <select 
          id="length-select"
          value={length}
          onChange={(e) => setLength(e.target.value as LengthType)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          aria-label="Выберите длину сказки"
          disabled={isLoading}
        >
          {lengthOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          О чем сказка? (необязательно):
        </label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Например: о драконе и принцессе"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-gray-500">
          Подсказка: чем больше деталей, тем интереснее будет сказка
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}
      
      <button
        onClick={handleGenerateTale}
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md
                  disabled:bg-purple-300 transition-colors flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Создание сказки...
          </>
        ) : (
          'Создать сказку'
        )}
      </button>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        Создание сказки может занять до 15-20 секунд
      </div>
    </div>
  );
}
