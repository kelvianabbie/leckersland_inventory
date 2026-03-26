interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false
}: ConfirmModalProps) {

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" 
        onClick={(e) => e.stopPropagation()}
    >
        <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-gray-600 mb-4">{message}</p>

            <div className="flex justify-end gap-2">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
                Cancel
            </button>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onConfirm();
                }}
                disabled={loading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
                {loading ? 'Processing...' : 'Confirm'}
            </button>
            </div>
        </div>
    </div>
  );
}