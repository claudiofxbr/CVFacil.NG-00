import React, { useState, useEffect, useRef } from 'react';
import { templates } from '../services/resumeService';
import { ResumeData, User } from '../types';
import ResumePreview from './ResumePreview';
import { exportToHtml, exportToDocx } from '../services/exportService';
import { api, getToken } from '../lib/apiClient';
import { useAuth } from './AuthProvider';

interface AppNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

declare global {
  interface Window { html2canvas: any; jspdf: any; }
}

// Normaliza a resposta da API (já em camelCase) para ResumeData, com fallbacks defensivos
function rowToResume(r: any): ResumeData {
  return {
    id:          r.id,
    userId:      r.userId,
    templateId:  r.templateId,
    themeMode:   r.themeMode,
    fullName:    r.fullName,
    role:        r.role,
    email:       r.email,
    phone:       r.phone,
    linkedin:    r.linkedin,
    portfolio:   r.portfolio,
    summary:     r.summary,
    experiences: r.experiences ?? [],
    education:   r.education   ?? [],
    skills:      r.skills      ?? [],
    languages:   r.languages   ?? [],
    hobbies:     r.hobbies     ?? [],
    avatarUrl:   r.avatarUrl   ?? '',
    isPinned:    r.isPinned,
    isImported:  r.isImported,
    lastUpdated: r.lastUpdated,
  };
}


const Dashboard: React.FC<{
  onCreate: (templateId: string) => void;
  onEdit: (resumeId: string) => void;
  userInfo: User;
  onNavigateAdmin?: () => void;
}> = ({ onCreate, onEdit, userInfo, onNavigateAdmin }) => {
  const { user, isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [resumes, setResumes]                 = useState<ResumeData[]>([]);
  const [resumeToDelete, setResumeToDelete]   = useState<ResumeData | null>(null);
  const [notification, setNotification]       = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [uploadProgress, setUploadProgress]   = useState(0);
  const [printingResume, setPrintingResume]   = useState<ResumeData | null>(null);
  const [previewingResume, setPreviewingResume] = useState<ResumeData | null>(null);
  const [sharingResume, setSharingResume]     = useState<ResumeData | null>(null);
  const [shareUrl, setShareUrl]               = useState<string | null>(null);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const printRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar currículos
  useEffect(() => {
    if (!user) return;
    api.get('/api/resumes')
      .then(({ resumes: rows }) => setResumes(sortList(rows.map(rowToResume))))
      .catch(() => setNotification({ message: 'Erro ao carregar currículos.', type: 'error' }));
  }, [user]);

  // Carregar notificações (ex.: avisos de crédito concedido pelo administrador)
  useEffect(() => {
    if (!user) return;
    api.get('/api/notifications')
      .then(({ notifications: rows }) => setAppNotifications(rows))
      .catch(() => { /* silencioso: notificações não são essenciais ao fluxo principal */ });
  }, [user]);

  const unreadCount = appNotifications.filter(n => !n.read).length;

  const handleMarkNotificationRead = async (id: string) => {
    setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.patch(`/api/notifications/${id}`); } catch { /* silent */ }
  };

  useEffect(() => {
    if (notification && notification.type !== 'loading') {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  useEffect(() => {
    if (printingResume && printRef.current) {
      const t = setTimeout(generatePdfAction, 1000);
      return () => clearTimeout(t);
    }
  }, [printingResume]);

  const sortList = (list: ResumeData[]) =>
    [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.lastUpdated ?? 0).getTime() - new Date(a.lastUpdated ?? 0).getTime();
    });

  const getTemplateName = (id: string) => templates.find(t => t.id === id)?.name ?? 'Personalizado';

  const getLastUpdatedText = (dateString?: string) => {
    if (!dateString) return 'Não salvo';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1)    return 'Agora mesmo';
    if (diff < 60)   return `Há ${diff} minutos`;
    if (diff < 1440) return `Há ${Math.floor(diff / 60)} horas`;
    return date.toLocaleDateString();
  };

  const handlePin = async (id: string) => {
    const resume = resumes.find(r => r.id === id);
    if (!resume) return;
    try {
      const { resume: updated } = await api.put(`/api/resumes/${id}`, { isPinned: !resume.isPinned });
      setResumes(prev => sortList(prev.map(r => r.id === id ? rowToResume(updated) : r)));
    } catch { /* silent */ }
  };

  const confirmDeleteResume = async () => {
    if (!resumeToDelete) return;
    try {
      await api.delete(`/api/resumes/${resumeToDelete.id}`);
      setResumes(prev => sortList(prev.filter(r => r.id !== resumeToDelete.id)));
      setNotification({ message: `"${resumeToDelete.fullName}" removido com sucesso.`, type: 'success' });
      setResumeToDelete(null);
    } catch {
      setNotification({ message: 'Erro ao excluir currículo.', type: 'error' });
    }
  };

  const handleDownloadPdf = (resume: ResumeData) => {
    setNotification({ message: 'Gerando visualização para PDF...', type: 'success' });
    setPrintingResume(resume);
  };

  const handleDownloadHtml = (resume: ResumeData) => {
    try { exportToHtml(resume); setNotification({ message: 'HTML exportado!', type: 'success' }); }
    catch { setNotification({ message: 'Erro ao exportar HTML.', type: 'error' }); }
  };

  const handleDownloadDocx = async (resume: ResumeData) => {
    setNotification({ message: 'Gerando documento Word (.docx)...', type: 'loading' });
    try { await exportToDocx(resume); setNotification({ message: 'DOCX exportado!', type: 'success' }); }
    catch { setNotification({ message: 'Erro ao exportar DOCX.', type: 'error' }); }
  };

  const handleDuplicate = async (resume: ResumeData) => {
    setNotification({ message: 'Duplicando currículo...', type: 'loading' });
    try {
      const { resume: newResume, message } = await api.post(`/api/resumes/${resume.id}/duplicate`, {});
      setResumes(prev => sortList([rowToResume(newResume), ...prev]));
      setNotification({ message, type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Erro ao duplicar currículo.', type: 'error' });
    }
  };

  const handleShare = async (resume: ResumeData) => {
    setNotification({ message: 'Gerando link de compartilhamento...', type: 'loading' });
    setSharingResume(resume);
    try {
      const { share_url } = await api.post(`/api/resumes/${resume.id}/share`, {});
      setShareUrl(share_url);
      setNotification({ message: 'Link de compartilhamento gerado!', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Erro ao gerar link de compartilhamento.', type: 'error' });
      setSharingResume(null);
    }
  };

  const handleCopyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setNotification({ message: 'Link copiado para a área de transferência!', type: 'success' });
    }
  };

  const waitForImages = async (el: HTMLElement) => {
    const imgs = Array.from(el.getElementsByTagName('img'));
    await Promise.all(imgs.map(img =>
      img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })
    ));
  };

  const generatePdfAction = async () => {
    if (!printRef.current) return;
    try {
      await waitForImages(printRef.current);
      const printContent = printRef.current.innerHTML;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head>
          <title>${printingResume?.fullName || 'Currículo'} - CVFacil.NG</title>
          <meta charset="UTF-8" />
          <script src="https://cdn.tailwindcss.com"><\/script>
          <script>tailwind.config={darkMode:'class',theme:{extend:{fontFamily:{sans:['Inter','sans-serif'],display:['Outfit','sans-serif']},colors:{primary:'#d97706',secondary:'#c2410c','forest-deep':'#020617','forest-base':'#0f172a','forest-surface':'#1e293b','forest-border':'#334155'}}}}<\/script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
          <style>body{font-family:'Inter',sans-serif}@media print{body{margin:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.section-container{padding:2cm;min-height:100vh}section,.group,li,tr{break-inside:avoid}}::-webkit-scrollbar{display:none}</style>
          </head><body class="${printingResume?.themeMode === 'dark' ? 'bg-forest-deep text-stone-200' : 'bg-white text-stone-800'}">
          <div class="section-container">${printContent}</div>
          <script>window.onload=function(){setTimeout(function(){window.print();},800)}<\/script>
          </body></html>`);
        win.document.close();
        setNotification({ message: "Selecione 'Salvar como PDF' na janela.", type: 'success' });
      } else {
        setNotification({ message: 'Pop-up bloqueado. Permita pop-ups para o PDF.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Erro ao preparar o PDF.', type: 'error' });
    } finally {
      setPrintingResume(null);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setNotification({ message: 'Apenas arquivos PDF são permitidos.', type: 'error' }); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNotification({ message: 'Arquivo muito grande. Máximo: 10MB.', type: 'error' }); return;
    }

    setNotification({ message: 'Analisando currículo com Inteligência Artificial...', type: 'loading' });
    setUploadProgress(0);
    const interval = setInterval(() =>
      setUploadProgress(p => p >= 95 ? p : p + Math.floor(Math.random() * 5) + 1), 400
    );

    try {
      // Enviar arquivo para servidor processar
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      // Sem isso, a chamada aguarda indefinidamente se o Gemini estiver lento/
      // sobrecarregado — a barra ficava travada em 95% sem nenhum retorno ao usuário.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos

      let importResponse: Response;
      try {
        importResponse = await fetch('/api/import-resume', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('A importação está demorando muito (mais de 2 minutos). O serviço de IA pode estar sobrecarregado — tente novamente em alguns instantes.');
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!importResponse.ok) {
        const errorData = await importResponse.json();
        throw new Error(errorData.error || 'Erro ao importar currículo');
      }

      const { resumeData } = await importResponse.json();

      // Salvar no banco de dados
      const savePayload = {
        fullName: resumeData.fullName,
        role: resumeData.role,
        email: resumeData.email,
        phone: resumeData.phone,
        linkedin: resumeData.linkedin,
        portfolio: resumeData.portfolio,
        summary: resumeData.summary,
        experiences: resumeData.experiences,
        education: resumeData.education,
        skills: resumeData.skills,
        languages: resumeData.languages,
        hobbies: resumeData.hobbies,
        templateId: 'original',
        themeMode: 'dark',
      };

      const { resume: saved } = await api.post('/api/resumes', savePayload);
      clearInterval(interval);
      setUploadProgress(100);
      setResumes(prev => sortList([rowToResume(saved), ...prev]));
      setNotification({ message: 'Currículo importado com sucesso!', type: 'success' });
      setTimeout(() => onEdit(saved.id), 1500);
    } catch (err: any) {
      clearInterval(interval);
      setUploadProgress(0);
      setNotification({ message: err.message || 'Falha ao importar currículo.', type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 relative">

      {/* Toast */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border backdrop-blur-md ${
          notification.type === 'success' ? 'bg-forest-deep/90 border-green-500/30 text-green-400' :
          notification.type === 'loading' ? 'bg-forest-deep/90 border-blue-500/30 text-blue-400' :
          'bg-red-950/90 border-red-500 text-red-200'
        }`}>
          <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-500/20' : notification.type === 'loading' ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
            <span className={`material-symbols-outlined ${notification.type === 'loading' ? 'animate-spin' : ''}`}>
              {notification.type === 'success' ? 'check' : notification.type === 'loading' ? 'sync' : 'warning'}
            </span>
          </div>
          <div>
            <p className="font-bold text-sm">Sistema CVFacil.NG</p>
            <p className="text-xs opacity-90">
              {notification.message}
              {notification.type === 'loading' && (
                <span className="ml-2 font-mono font-bold bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">{uploadProgress}%</span>
              )}
            </p>
            {notification.type === 'loading' && (
              <div className="w-full bg-blue-900/30 h-1 mt-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF print area */}
      {printingResume && (
        <div className="fixed top-0 left-0 z-[-100] w-[210mm] pointer-events-none opacity-0">
          <div ref={printRef} style={{ width: '100%' }}><ResumePreview data={printingResume} /></div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />

      {/* Delete confirmation */}
      {resumeToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-[#1a0f0f] border border-red-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)]">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #dc2626 0, #dc2626 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mb-6 animate-bounce">
                <span className="material-symbols-outlined text-3xl text-red-500">delete_forever</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Excluir Currículo?</h3>
              <p className="text-stone-400 text-sm mb-6 leading-relaxed">
                Esta ação removerá o currículo do <strong className="text-white">CVFacil.NG</strong>. Não será possível recuperá-lo.
              </p>
              <div className="w-full bg-red-950/20 border border-red-900/30 rounded-xl p-4 flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-lg bg-red-900/50 flex-shrink-0 overflow-hidden">
                  {resumeToDelete.avatarUrl
                    ? <img src={resumeToDelete.avatarUrl} alt="User" className="w-full h-full object-cover grayscale opacity-70" />
                    : <div className="w-full h-full flex items-center justify-center text-red-400"><span className="material-symbols-outlined">description</span></div>
                  }
                </div>
                <div className="text-left overflow-hidden">
                  <p className="font-bold text-red-100 truncate text-sm">{resumeToDelete.fullName}</p>
                  <p className="text-[10px] text-red-400/80 truncate uppercase tracking-wider">{resumeToDelete.role || 'Sem cargo'}</p>
                </div>
              </div>
              <div className="flex w-full gap-3">
                <button onClick={() => setResumeToDelete(null)} className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 font-bold hover:bg-white/5 transition-colors text-xs uppercase tracking-wider">Cancelar</button>
                <button onClick={confirmDeleteResume} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                  <span>Excluir</span><span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {sharingResume && shareUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-[#1a0f0f] border border-cyan-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.15)]">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #06b6d4 0, #06b6d4 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/20 flex items-center justify-center mb-6 animate-pulse">
                <span className="material-symbols-outlined text-3xl text-cyan-500">share</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Compartilhar Currículo</h3>
              <p className="text-stone-400 text-sm mb-6 leading-relaxed">
                Copie este link para compartilhar seu currículo com outras pessoas
              </p>
              <div className="w-full bg-cyan-950/20 border border-cyan-900/30 rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-cyan-300 mb-2 uppercase tracking-wider">Link de Compartilhamento</p>
                <div className="flex items-center gap-2 bg-forest-deep rounded-lg p-3 border border-cyan-900/20">
                  <input type="text" readOnly value={shareUrl} className="flex-1 bg-transparent text-cyan-300 text-xs font-mono outline-none" />
                  <button onClick={handleCopyShareLink} className="p-2 hover:bg-cyan-500/20 text-cyan-400 rounded transition-colors">
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-3">💡 <strong>Dica:</strong> Qualquer pessoa com este link pode visualizar seu currículo. Você pode desativar o compartilhamento a qualquer momento.</p>
              </div>
              <div className="flex w-full gap-3">
                <button onClick={() => { setSharingResume(null); setShareUrl(null); }} className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 font-bold hover:bg-white/5 transition-colors text-xs uppercase tracking-wider">Fechar</button>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-600/20 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                  <span>Visualizar</span><span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewingResume && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-forest-deep border border-forest-border/20 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-6 border-b border-forest-border/10 flex items-center justify-between bg-forest-deep/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg"><span className="material-symbols-outlined text-primary">visibility</span></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Visualização do Currículo</h3>
                  <p className="text-xs text-stone-500">{previewingResume.fullName} • {previewingResume.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => handleDownloadPdf(previewingResume)} className="px-3 py-2 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition-all flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>PDF
                </button>
                <button onClick={() => handleDownloadDocx(previewingResume)} className="px-3 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[16px]">description</span>Word
                </button>
                <button onClick={() => handleDownloadHtml(previewingResume)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[16px]">code</span>HTML
                </button>
                <button onClick={() => { const id = previewingResume.id; setPreviewingResume(null); onEdit(id); }} className="px-3 py-2 bg-forest-surface border border-forest-border text-stone-200 rounded-xl font-bold hover:border-primary/50 transition-all flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[16px]">edit</span>Editar
                </button>
                <button onClick={() => setPreviewingResume(null)} className="p-2 hover:bg-white/10 text-stone-400 hover:text-white rounded-xl transition-all">
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-forest-deep/30">
              <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
                <ResumePreview data={previewingResume} />
              </div>
            </div>
            <div className="p-4 border-t border-forest-border flex flex-wrap justify-center gap-6 bg-forest-deep/50 text-xs text-stone-500">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-primary text-[14px]">picture_as_pdf</span>PDF — impressão fiel ao visual</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-blue-400 text-[14px]">description</span>Word (.docx) — editável</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-emerald-400 text-[14px]">code</span>HTML — página web independente</span>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-forest-deep/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-forest-surface border border-forest-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-bold text-white">Escolha um Modelo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <button key={template.id} onClick={() => onCreate(template.id)} className="group relative overflow-hidden rounded-xl border-2 border-forest-border hover:border-primary transition-all duration-300 text-left bg-forest-deep">
                  <div className="h-32 w-full relative" style={{ backgroundColor: template.color }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-deep to-transparent opacity-50"></div>
                    <div className="absolute bottom-3 left-3 bg-forest-deep/90 px-2 py-1 rounded text-xs font-bold text-white shadow-lg">{template.name}</div>
                  </div>
                  <div className="p-4"><p className="text-xs text-stone-400">{template.description}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row gap-6 items-center md:items-center">
        {userInfo.avatar && (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-forest-border shadow-2xl flex-shrink-0">
            <img src={userInfo.avatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
            Olá, <span className="text-primary">{userInfo.name}!</span> 👋
          </h1>
          <p className="text-stone-400 max-w-xl">Bem-vindo de volta ao CVFacil.NG. Aqui está o resumo das suas atividades.</p>
        </div>

        <div className="flex items-center gap-3">
          {!isAdmin && (
            <div className={`px-4 py-2 rounded-xl border font-bold text-sm flex items-center gap-2 ${
              (user?.credits ?? 0) < 0 ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-forest-border bg-forest-surface text-stone-200'
            }`} title="Saldo de créditos para criação de currículos">
              <span className="material-symbols-outlined text-[18px]">toll</span>
              {user?.credits ?? 0} créditos
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="relative w-11 h-11 rounded-xl bg-forest-surface border border-forest-border flex items-center justify-center text-stone-300 hover:text-white hover:border-primary/50 transition-colors"
              title="Notificações"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-forest-surface border border-forest-border rounded-2xl shadow-2xl z-50 custom-scrollbar">
                <div className="px-4 py-3 border-b border-forest-border flex items-center justify-between">
                  <p className="font-bold text-white text-sm">Notificações</p>
                  <button onClick={() => setShowNotifications(false)} className="text-stone-400 hover:text-white">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                {appNotifications.length === 0 ? (
                  <p className="p-4 text-xs text-stone-500 text-center">Nenhuma notificação por enquanto.</p>
                ) : (
                  appNotifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className={`w-full text-left px-4 py-3 border-b border-forest-border/50 last:border-0 hover:bg-forest-border/20 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                    >
                      <p className={`text-xs ${!n.read ? 'text-stone-100 font-bold' : 'text-stone-400'}`}>{n.message}</p>
                      <p className="text-[10px] text-stone-600 mt-1">{getLastUpdatedText(n.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-forest-surface border border-forest-border rounded-[1.5rem] p-8 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-all group">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[32px]">description</span>
          </div>
          <p className="text-4xl font-display font-bold text-white mb-1">{resumes.length}</p>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Currículos Criados</p>
        </div>

        <button onClick={handleImportClick} className="bg-forest-surface border border-forest-border rounded-[1.5rem] p-8 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">AI Pro</div>
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[32px]">upload_file</span>
          </div>
          <p className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Importar PDF</p>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Gemini 3 Flash</p>
        </button>

        <button onClick={() => setIsModalOpen(true)} className="bg-transparent border-2 border-dashed border-forest-border rounded-[1.5rem] p-8 flex flex-col items-center justify-center text-center hover:bg-forest-surface hover:border-primary/50 transition-all group">
          <div className="w-16 h-16 rounded-full bg-forest-surface flex items-center justify-center text-stone-400 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-[32px]">add</span>
          </div>
          <p className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">Novo Currículo</p>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Escolher Modelo</p>
        </button>
      </div>

      {/* Acesso à administração — visível apenas para Administradores */}
      {isAdmin && onNavigateAdmin && (
        <button
          onClick={onNavigateAdmin}
          className="w-full flex items-center justify-between gap-4 bg-forest-surface border border-forest-border rounded-[1.5rem] p-6 hover:border-primary/50 transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            </div>
            <div>
              <p className="font-bold text-white group-hover:text-primary transition-colors">Administração do Sistema</p>
              <p className="text-xs text-stone-500">Gerenciar usuários, permissões e créditos de todo o CVFacil.NG</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-stone-500 group-hover:text-primary transition-colors">arrow_forward</span>
        </button>
      )}

      {/* Resumes Grid */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-display font-bold text-white">Seus Currículos</h3>
          <div className="h-px flex-1 bg-forest-border mx-6 hidden md:block"></div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">{resumes.length} Documentos</span>
        </div>

        {resumes.length === 0 ? (
          <div className="bg-forest-surface/50 border-2 border-dashed border-forest-border rounded-[2rem] p-12 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-forest-surface flex items-center justify-center text-stone-600 mb-4">
              <span className="material-symbols-outlined text-[40px]">folder_open</span>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Nenhum currículo encontrado</h4>
            <p className="text-stone-500 max-w-xs mx-auto mb-8">Comece agora criando seu primeiro currículo profissional.</p>
            <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-secondary text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
              <span>Criar Primeiro Currículo</span><span className="material-symbols-outlined">add</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div key={resume.id} className="group bg-forest-surface border border-forest-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col shadow-xl">
                <div className="h-48 bg-forest-deep relative overflow-hidden">
                  <div className="absolute inset-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <div className="w-1/2 h-4 bg-stone-500 rounded mb-2"></div>
                    <div className="w-full h-2 bg-stone-600 rounded mb-1"></div>
                    <div className="w-full h-2 bg-stone-600 rounded mb-1"></div>
                    <div className="w-3/4 h-2 bg-stone-600 rounded mb-4"></div>
                    <div className="w-full h-20 bg-stone-700 rounded"></div>
                  </div>
                  <div className="absolute inset-0 bg-forest-deep/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px] flex-wrap p-4">
                    {[
                      { icon: 'visibility', action: () => setPreviewingResume(resume), hover: 'hover:bg-forest-border' },
                      { icon: 'edit',       action: () => onEdit(resume.id),           hover: 'hover:bg-primary' },
                      { icon: 'file_copy',  action: () => handleDuplicate(resume),    hover: 'hover:bg-purple-600' },
                      { icon: 'share',      action: () => handleShare(resume),         hover: 'hover:bg-cyan-600' },
                      { icon: 'picture_as_pdf', action: () => handleDownloadPdf(resume), hover: 'hover:bg-red-600' },
                      { icon: 'description', action: () => handleDownloadDocx(resume), hover: 'hover:bg-blue-600' },
                      { icon: 'code',       action: () => handleDownloadHtml(resume),  hover: 'hover:bg-emerald-600' },
                    ].map(({ icon, action, hover }) => (
                      <button key={icon} onClick={action} className={`w-9 h-9 rounded-full bg-forest-surface text-white flex items-center justify-center ${hover} transition-colors shadow-lg border border-white/10`} title={icon}>
                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => handlePin(resume.id)} className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${resume.isPinned ? 'bg-primary text-white' : 'bg-forest-surface/80 text-stone-400 opacity-0 group-hover:opacity-100 hover:text-white'}`}>
                    <span className="material-symbols-outlined text-[18px]">{resume.isPinned ? 'push_pin' : 'keep'}</span>
                  </button>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-forest-surface/80 text-stone-300 px-2 py-1 rounded border border-white/5 backdrop-blur-md">
                      {getTemplateName(resume.templateId)}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="overflow-hidden">
                      <h4 className="text-white font-bold truncate group-hover:text-primary transition-colors">{resume.fullName}</h4>
                      <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold truncate">{resume.role || 'Sem cargo'}</p>
                    </div>
                    <button onClick={() => setResumeToDelete(resume)} className="text-stone-600 hover:text-red-500 transition-colors p-1">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                  <div className="mt-auto pt-4 border-t border-forest-border flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-stone-600">history</span>
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-tighter">{getLastUpdatedText(resume.lastUpdated)}</span>
                    </div>
                    <div className="flex -space-x-2">
                      <div className={`w-5 h-5 rounded-full border border-forest-surface ${resume.themeMode === 'dark' ? 'bg-forest-deep' : 'bg-white'}`}></div>
                      <div className="w-5 h-5 rounded-full border border-forest-surface bg-primary"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="pt-12 border-t border-forest-border flex flex-col md:flex-row justify-between items-center gap-6 text-stone-600">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">security</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Seus dados estão protegidos com criptografia</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">Termos de Uso</a>
          <a href="#" className="text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">Privacidade</a>
          <a href="#" className="text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">Suporte</a>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
