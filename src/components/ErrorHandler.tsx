import { useState, useEffect } from 'react';

interface ErrorHandlerProps {
  error: string | null;
  onRetry?: () => void;
  onClose?: () => void;
  maxRetries?: number;
  retryCount?: number;
  showClose?: boolean;
  autoRetry?: boolean;
  errorType?: 'api' | 'network' | 'auth' | 'validation' | 'generic';
}

export default function ErrorHandler({
  error,
  onRetry,
  onClose,
  maxRetries = 3,
  retryCount = 0,
  showClose = true,
  autoRetry = false,
  errorType = 'generic'
}: ErrorHandlerProps) {
  const [countdown, setCountdown] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(!!error);
  
  // Делаем компонент видимым, когда есть ошибка
  useEffect(() => {
    if (error) {
      setIsVisible(true);
    }
  }, [error]);
  
  // Сбрасываем таймер обратного отсчета при изменении ошибки
  useEffect(() => {
    if (!error) {
      setCountdown(0);
      return;
    }
  }, [error]);
  
  // Автоматическая повторная попытка с увеличивающимся временем ожидания
  useEffect(() => {
    if (!error || !autoRetry || retryCount >= maxRetries || !onRetry) {
      return;
    }
    
    // Увеличиваем время ожидания с каждой попыткой
    const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 16000);
    setCountdown(Math.floor(retryDelay / 1000));
    
    const intervalId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    const timeoutId = setTimeout(() => {
      if (onRetry) onRetry();
    }, retryDelay);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [error, autoRetry, retryCount, maxRetries, onRetry]);
  
  // Обработчик закрытия уведомления об ошибке
  const handleClose = () => {
    // Анимируем скрытие
    setIsVisible(false);
    
    // Вызываем onClose после небольшой задержки для анимации
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };
  
  if (!error) return null;
  
  // Определяем цвет и стиль в зависимости от типа ошибки
  const getErrorStyles = () => {
    switch (errorType) {
      case 'api':
        return {
          container: 'border-orange-500 bg-orange-50',
          text: 'text-orange-700',
          icon: '🔌',
          title: 'Ошибка API'
        };
      case 'network':
        return {
          container: 'border-red-500 bg-red-50',
          text: 'text-red-700',
          icon: '🌐',
          title: 'Ошибка сети'
        };
      case 'auth':
        return {
          container: 'border-blue-500 bg-blue-50',
          text: 'text-blue-700',
          icon: '🔑',
          title: 'Ошибка авторизации'
        };
      case 'validation':
        return {
          container: 'border-yellow-500 bg-yellow-50',
          text: 'text-yellow-700',
          icon: '⚠️',
          title: 'Ошибка валидации'
        };
      default:
        return {
          container: 'border-red-500 bg-red-50',
          text: 'text-red-700',
          icon: '❌',
          title: 'Ошибка'
        };
    }
  };
  
  const styles = getErrorStyles();
  
  return (
    <div 
      className={`p-4 mb-4 rounded-md border-l-4 ${styles.container} ${styles.text} 
                 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ maxHeight: isVisible ? '500px' : '0px', overflow: 'hidden' }}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 text-xl">{styles.icon}</div>
        <div className="flex-1">
          <h4 className="text-lg font-medium">{styles.title}</h4>
          <p className="mt-1">{error}</p>
          
          {/* Информация о повторных попытках */}
          {retryCount > 0 && maxRetries > 0 && (
            <p className="mt-2 text-sm">
              {retryCount >= maxRetries ? 
                'Достигнуто максимальное количество попыток.' : 
                `Попытка ${retryCount} из ${maxRetries}`}
            </p>
          )}
          
          {/* Обратный отсчет */}
          {countdown > 0 && (
            <p className="mt-2 text-sm">
              Повторная попытка через {countdown} сек...
            </p>
          )}
          
          {/* Кнопки */}
          <div className="mt-3 flex space-x-2">
            {onRetry && retryCount < maxRetries && (
              <button 
                onClick={onRetry}
                className={`px-3 py-1 rounded text-sm bg-white border ${styles.text} hover:bg-gray-100`}
              >
                Повторить
              </button>
            )}
            
            {showClose && (
              <button 
                onClick={handleClose}
                className="px-3 py-1 rounded text-sm bg-white border text-gray-700 hover:bg-gray-100"
              >
                Закрыть
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
