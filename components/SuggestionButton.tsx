import React, { useState } from 'react';

interface SuggestionButtonProps {
  field: 'summary' | 'role' | 'company' | 'experience_description' | 'degree' | 'skill';
  currentText: string;
  context?: {
    fullName?: string;
    role?: string;
    targetRole?: string;
    industry?: string;
    company?: string;
  };
  language?: string;
  onSuggestionSelect: (suggestion: string) => void;
}

export const SuggestionButton: React.FC<SuggestionButtonProps> = ({
  field,
  currentText,
  context = {},
  language = 'pt-BR',
  onSuggestionSelect,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = async () => {
    if (!currentText.trim()) {
      setError('Preencha o campo antes de solicitar sugestões.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          field,
          currentText,
          context,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar sugestões');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar sugestões');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const fieldLabels = {
    summary: 'Resumo',
    role: 'Cargo',
    company: 'Empresa',
    experience_description: 'Descrição da Experiência',
    degree: 'Grau/Certificação',
    skill: 'Habilidade',
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={generateSuggestions}
        disabled={loading}
        title={`Gerar sugestões com IA para ${fieldLabels[field]}`}
        className="absolute right-3 top-3 px-3 py-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs rounded-lg hover:shadow-lg hover:shadow-purple-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
        <span className="hidden sm:inline">{loading ? 'Gerando...' : 'IA'}</span>
      </button>

      {/* Sugestões Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute right-0 top-12 z-50 bg-forest-surface border border-forest-border rounded-xl shadow-2xl overflow-hidden w-96 max-w-[90vw]">
          <div className="p-4 border-b border-forest-border/50 bg-forest-deep/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-[18px]">lightbulb</span>
              <p className="text-sm font-bold text-white">Sugestões IA</p>
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-stone-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-forest-border/50">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  onSuggestionSelect(suggestion);
                  setShowSuggestions(false);
                }}
                className="w-full text-left p-4 hover:bg-purple-600/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-purple-400">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-200 break-words group-hover:text-white transition-colors">
                      {suggestion}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-stone-600 group-hover:text-cyan-400 transition-colors flex-shrink-0">
                    check_circle
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 bg-forest-deep/30 border-t border-forest-border/50 flex items-center gap-2 text-[10px] text-stone-500">
            <span className="material-symbols-outlined text-[14px]">info</span>
            <span>Clique em uma sugestão para aplicar</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute right-0 top-12 z-50 bg-red-950/90 border border-red-900/50 rounded-lg shadow-xl px-3 py-2 text-xs text-red-200 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};

export default SuggestionButton;
