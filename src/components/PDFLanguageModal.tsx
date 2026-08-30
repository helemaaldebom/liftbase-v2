import { X } from 'lucide-react';

interface PDFLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLanguage: (language: 'nl' | 'en' | 'de' | 'es' | 'fr') => void;
  title: string;
}

export function PDFLanguageModal({ isOpen, onClose, onSelectLanguage, title }: PDFLanguageModalProps) {
  if (!isOpen) return null;

  const languages = [
    { code: 'nl' as const, label: 'Nederlands' },
    { code: 'en' as const, label: 'English' },
    { code: 'de' as const, label: 'Deutsch' },
    { code: 'es' as const, label: 'Español' },
    { code: 'fr' as const, label: 'Français' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Selecteer de taal voor het PDF rapport:
          </p>
          <div className="space-y-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className="w-full px-4 py-3 text-left border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors"
              >
                <span className="text-slate-900 font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
