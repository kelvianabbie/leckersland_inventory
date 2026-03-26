type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type?: AlertType;
  children: React.ReactNode;
}

export default function Alert({ type = 'info', children }: AlertProps) {
  const styles = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  
  return (
    <div className={`border-l-4 p-4 mb-4 ${styles[type]}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </div>
        <div className="ml-3">
          <p className="text-sm text-center">{children}</p>
        </div>
      </div>
    </div>
  );
}