interface LoadingProps {
  message?: string;
}

export default function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mr-4"></div>
      <span className="text-gray-600">{message}</span>
    </div>
  );
}