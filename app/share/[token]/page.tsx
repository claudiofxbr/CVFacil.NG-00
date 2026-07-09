'use client';

import { useEffect, useState } from 'react';
import { ResumeData } from '@/types';
import ResumePreview from '@/components/ResumePreview';

const SharePage = ({ params }: { params: Promise<{ token: string }> }) => {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const { token } = await params;
      setToken(token);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const fetchResume = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/share/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Currículo não encontrado ou o compartilhamento foi desativado.');
          } else {
            setError('Erro ao carregar o currículo.');
          }
          return;
        }

        const data = await response.json();
        setResume(data.resume);
      } catch (err) {
        setError('Erro ao carregar o currículo.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-forest-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-400 font-display font-bold animate-pulse uppercase tracking-widest text-xs">Carregando Currículo...</p>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-forest-deep flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-3">Oops!</h1>
          <p className="text-stone-400 mb-8">{error || 'Currículo não encontrado.'}</p>
          <a href="/" className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-secondary transition-all">
            Voltar para CVFacil.NG
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forest-deep">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-forest-deep/95 backdrop-blur-md border-b border-forest-border/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">description</span>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">CVFacil.NG</p>
              <p className="text-sm font-bold text-white">Currículo Compartilhado</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-secondary transition-all flex items-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined">print</span>
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-forest-surface border border-forest-border text-stone-300 rounded-lg font-bold hover:border-primary/50 transition-all text-sm"
            >
              CVFacil.NG
            </a>
          </div>
        </div>
      </div>

      {/* Resume Content */}
      <div className="py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          <ResumePreview data={resume} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-forest-border/20 bg-forest-surface/50 backdrop-blur-md py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">
            Currículo compartilhado via <span className="text-primary">CVFacil.NG</span> • Construtor de Currículos com IA
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
