import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import ErrorHandler from './ErrorHandler';

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

// Функция для проверки доступности API
const checkApiAvailability = async (apiPath: string): Promise<boolean> => {
  try {
    // Таймаут для запроса - 10 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(apiPath, {
      method: 'HEAD',
      signal: controller.signal,
      // Добавляем случайный параметр для предотвращения кэширования
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`Ошибка при проверке API ${apiPath}:`, error);
    return false;
  }
};

export default function FairyTaleGenerator({ onTaleGenerated, onGenerating }: FairyTaleGeneratorProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [theme, setTheme] = useState<ThemeType>('волшебная');
  const [length, setLength] = useState<LengthType>('короткая');
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isForceApiCheck, setIsForceApiCheck] = useState<boolean>(false);
  
  // Сохраняем состояние ввода пользователя для восстановления при ошибках
  const formStateRef = useRef({
    prompt: '',
    theme: 'волшебная' as ThemeType,
    length: 'короткая' as LengthType
  });
  
  // Проверяем доступность API при загрузке компонента
  useEffect(() => {
    const checkApi = async () => {
      try {
        // Сначала пробуем прямой запрос к API
        const isAvailable = await checkApiAvailability('/api/openai/chat');
        
        if (isAvailable) {
          setApiAvailable(true);
          setError(null);
          return;
        }
        
        // Если API недоступен, проверяем функцию Netlify для тестирования
        const testResponse = await fetch('/.netlify/functions/test-openai');
        if (testResponse.ok) {
          const testData = await testResponse.json();
          
          if (testData.success) {
            setApiAvailable(true);
            setError(null);
          } else {
            setApiAvailable(false);
            setError(`API OpenAI недоступен: ${testData.details || 'причина не указана'}`);
          }
        } else {
          setApiAvailable(false);
          setError('API OpenAI недоступен. Возможно, не настроен API-ключ или сервер перегружен. Пожалуйста, попробуйте позже.');
        }
      } catch (e) {
        // Если проверка API выдает ошибку, предполагаем, что API недоступен
        setApiAvailable(false);
        setError('Не удалось проверить доступность API. Пожалуйста, убедитесь, что у вас есть подключение к интернету.');
      }
    };
    
    checkApi();
  }, [isForceApiCheck]); // Перепроверка при изменении isForceApiCheck

  // Сохраняем текущее состояние формы при каждом изменении
  useEffect(() => {
    formStateRef.current = {
      prompt,
      theme,
      length
    };
  }, [prompt, theme, length]);

  // Используем ai/react для взаимодействия с чат-моделью
  const { append, isLoading, error: chatError } = useChat({
    api: '/api/openai/chat',
    onFinish: (message) => {
      if (message.content.trim().length > 0) {
        onTaleGenerated(message.content);
        // Сбрасываем счетчик повторных попыток при успехе
        setRetryCount(0);
      } else {
        setError('Получена пустая сказка. Пожалуйста, попробуйте еще раз.');
      }
    },
    onError: (err) => {
      console.error('Ошибка при генерации сказки:', err);
      
      // Разные сообщения об ошибках в зависимости от причины
      if (err.message && err.message.includes('API key')) {
        setError('Ошибка API-ключа. Убедитесь, что OpenAI API ключ правильно настроен в окружении.');
      } else if (err.message && err.message.includes('429')) {
        setError('Превышен лимит запросов. Пожалуйста, подождите немного и попробуйте снова.');
      } else if (err.message && err.message.includes('5')) {
        // Ошибки 5xx указывают на проблемы на стороне сервера
        setError('Проблемы с сервером OpenAI. Пожалуйста, попробуйте еще раз позже.');
      } else {
        setError('Произошла ошибка при создании сказки. Пожалуйста, попробуйте еще раз.');
      }
      
      // Увеличиваем счетчик попыток
      setRetryCount(prev => prev + 1);
    }
  });
  
  // Если есть ошибка из useChat, синхронизируем с нашим состоянием error
  useEffect(() => {
    if (chatError) {
      setError(chatError.message);
    }
  }, [chatError]);
  
  // Автоматическая повторная попытка при ошибках сервера (не более 3 раз)
  useEffect(() => {
    if (error && error.includes('сервер') && retryCount < 3) {
      const retryTimer = setTimeout(() => {
        handleGenerateTale();
      }, 3000 * retryCount); // Увеличиваем время ожидания с каждой повторной попыткой
      
      return () => clearTimeout(retryTimer);
    }
  }, [error, retryCount]);

  const handleGenerateTale = useCallback(async () => {
    setError(null);
    onGenerating();
    
    // Сохраняем текущее состояние формы перед отправкой запроса
    formStateRef.current = {
      prompt,
      theme,
      length
    };
    
    // Проверяем доступность API перед отправкой запроса
    const isAvailable = await checkApiAvailability('/api/openai/chat');
    if (!isAvailable) {
      setError('API OpenAI недоступен. Пожалуйста, попробуйте позже.');
      setApiAvailable(false);
      return;
    }
    
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
    
    try {
      await append({
        role: 'user',
        content: systemPrompt,
      });
    } catch (err) {
      // Обрабатываем ошибку, если append не удался
      console.error('Ошибка при отправке запроса:', err);
      setError('Ошибка при отправке запроса. Пожалуйста, попробуйте еще раз.');
      // Форма останется видимой, т.к. мы не меняем состояние приложения
    }
  }, [append, length, theme, prompt, onGenerating]);

  // Функция для проверки API вручную
  const handleCheckAPI = useCallback(() => {
    setIsForceApiCheck(prev => !prev);
  }, []);

  // Восстановление последнего состояния формы
  const handleRestoreFormState = useCallback(() => {
    setPrompt(formStateRef.current.prompt);
    setTheme(formStateRef.current.theme);
    setLength(formStateRef.current.length);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">Генератор сказок</h2>
      
      {/* Сообщение об ошибке */}
      {error && (
        <ErrorHandler
          error={error}
          onRetry={() => {
            setError(null);
            handleRestoreFormState();
            handleGenerateTale();
          }}
          onClose={() => setError(null)}
          retryCount={retryCount}
          maxRetries={3}
          errorType={error
