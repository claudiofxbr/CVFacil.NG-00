import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api, downloadFile } from '../lib/apiClient';
import { useAuth } from './AuthProvider';
import { compressImage } from '../services/resumeService';

interface Payment {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  method: string | null;
  status: string;
  createdAt: string;
}

const formatCents = (cents: number, currency: string) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: currency.toUpperCase() });

const formatMethod = (method: string | null) =>
  method === 'pix' ? 'Pix' : method === 'card' ? 'Cartão' : method ?? '—';

const formatStatus = (status: string) =>
  status === 'paid' ? 'Pago' : status === 'failed' ? 'Falhou' : status;

interface SettingsProps {
  userInfo: User;
  onProfileUpdate: (name: string, email: string, avatar?: string) => void;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  last_login: string;
  role: string;
  avatar?: string;
  credits?: number;
}

const Settings: React.FC<SettingsProps> = ({ userInfo, onProfileUpdate }) => {
  const { user, isAdmin, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'admin' | 'connections' | 'payments'>('profile');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsFrom, setPaymentsFrom] = useState('');
  const [paymentsTo, setPaymentsTo] = useState('');
  const [isExportingPayments, setIsExportingPayments] = useState(false);
  const [editingClient, setEditingClient]   = useState<ClientData | null>(null);
  const [userToDelete, setUserToDelete]     = useState<ClientData | null>(null);
  const [notification, setNotification]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isTestingAi, setIsTestingAi]       = useState(false);
  const [aiTestResult, setAiTestResult]     = useState<string | null>(null);
  const [name, setName]     = useState(userInfo.name);
  const [email, setEmail]   = useState(userInfo.email);
  const [avatar, setAvatar] = useState(userInfo.avatar);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      const compressed = await compressImage(e.target.files[0], 300);
      setAvatar(compressed);
    } catch {
      setNotification({ message: 'Erro ao processar a imagem.', type: 'error' });
    }
  };

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const fetchClients = async () => {
    if (!isAdmin) return;
    try {
      const { users } = await api.get('/api/users');
      setClients(users);
    } catch {
      setNotification({ message: 'Erro ao carregar usuários.', type: 'error' });
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) fetchClients();
  }, [activeTab, isAdmin]);

  const fetchPayments = async () => {
    try {
      const qs = new URLSearchParams();
      if (paymentsFrom) qs.set('from', paymentsFrom);
      if (paymentsTo) qs.set('to', paymentsTo);
      const { payments: rows } = await api.get(`/api/payments?${qs.toString()}`);
      setPayments(rows);
    } catch {
      setNotification({ message: 'Erro ao carregar pagamentos.', type: 'error' });
    }
  };

  useEffect(() => {
    if (activeTab === 'payments') fetchPayments();
  }, [activeTab]);

  const handleExportPayments = async () => {
    setIsExportingPayments(true);
    try {
      const qs = new URLSearchParams();
      if (paymentsFrom) qs.set('from', paymentsFrom);
      if (paymentsTo) qs.set('to', paymentsTo);
      qs.set('format', 'csv');
      await downloadFile(`/api/payments?${qs.toString()}`, 'pagamentos-cvfacil.csv');
    } catch {
      setNotification({ message: 'Erro ao exportar pagamentos.', type: 'error' });
    } finally {
      setIsExportingPayments(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const { text } = await api.post('/api/ai-editor', { action: 'test-connection' });
      setAiTestResult(text || 'Sem resposta de texto.');
      setNotification({ message: 'Conexão com Gemini estabelecida!', type: 'success' });
    } catch (err: any) {
      // A rota server-side já traduz erros de quota/sobrecarga em mensagens
      // amigáveis; para os demais mantemos o detalhe técnico, pois esta é uma
      // ferramenta de diagnóstico para o admin.
      setNotification({ message: `Falha no teste: ${err.message}`, type: 'error' });
      setAiTestResult(`Erro: ${err.message}`);
    } finally {
      setIsTestingAi(false);
    }
  };

  const requestDelete = (client: ClientData) => {
    if (client.email === 'admin@cvfacil.ng') {
      setNotification({ message: 'O Administrador Master não pode ser removido.', type: 'error' }); return;
    }
    setUserToDelete(client);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/users/${userToDelete.id}`);
      setNotification({ message: `${userToDelete.name} removido com sucesso.`, type: 'success' });
      setUserToDelete(null);
      fetchClients();
    } catch {
      setNotification({ message: 'Erro ao excluir usuário.', type: 'error' });
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      const credits = editingClient.role === 'Administrador' ? 999999 : Number(editingClient.credits);
      await api.put(`/api/users/${editingClient.id}`, { ...editingClient, credits });
      if (editingClient.id === user?.id) {
        onProfileUpdate(editingClient.name, editingClient.email, editingClient.avatar);
        await refreshUser();
      }
      setEditingClient(null);
      setNotification({ message: 'Usuário atualizado com sucesso.', type: 'success' });
      fetchClients();
    } catch (err: any) {
      setNotification({ message: err.message || 'Erro ao salvar.', type: 'error' });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await api.put(`/api/users/${user.id}`, { name, email, avatar });
      onProfileUpdate(name, email, avatar);
      await refreshUser();
      setNotification({ message: 'Perfil atualizado com sucesso!', type: 'success' });
    } catch {
      setNotification({ message: 'Erro ao atualizar perfil.', type: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative">

      {/* Toast */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border backdrop-blur-md ${
          notification.type === 'success' ? 'bg-forest-deep/90 border-green-500/30 text-green-400' : 'bg-red-950/90 border-red-500 text-red-200'
        }`}>
          <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <span className="material-symbols-outlined">{notification.type === 'success' ? 'check' : 'warning'}</span>
          </div>
          <div>
            <p className="font-bold text-sm">Sistema</p>
            <p className="text-xs opacity-90">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Delete user confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-[#1a0f0f] border border-red-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.2)]">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #dc2626 0, #dc2626 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center mb-6 animate-pulse">
                <span className="material-symbols-outlined text-4xl text-red-500">person_remove</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Remover Usuário?</h3>
              <p className="text-red-300/70 text-sm mb-8 leading-relaxed">Esta ação é irreversível e removerá o acesso do usuário ao CVFacil.NG.</p>
              <div className="flex w-full gap-3">
                <button onClick={() => setUserToDelete(null)} className="flex-1 py-4 rounded-xl border border-stone-700 text-stone-400 font-bold hover:bg-white/5 transition-colors uppercase text-xs tracking-wider">Cancelar</button>
                <button onClick={confirmDeleteUser} className="flex-1 py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all uppercase text-xs tracking-wider">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editingClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-forest-surface border border-forest-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Editar Usuário</h3>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Nome</label>
                <input value={editingClient.name} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} className="w-full bg-forest-deep border border-forest-border rounded-lg p-2 text-white focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Email</label>
                <input value={editingClient.email} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} className="w-full bg-forest-deep border border-forest-border rounded-lg p-2 text-white focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase flex justify-between">
                  Créditos {editingClient.role === 'Administrador' && <span className="text-primary text-[10px]">Ilimitado</span>}
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={editingClient.role === 'Administrador'} onClick={() => setEditingClient(p => p ? { ...p, credits: Math.max(0, (p.credits ?? 0) - 1) } : null)} className="w-10 h-10 rounded-lg bg-forest-deep border border-forest-border flex items-center justify-center text-stone-400 hover:text-white disabled:opacity-30">
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <input type="number" disabled={editingClient.role === 'Administrador'} value={editingClient.role === 'Administrador' ? 999 : editingClient.credits} onChange={e => setEditingClient({ ...editingClient, credits: parseInt(e.target.value) || 0 })} className="flex-1 bg-forest-deep border border-forest-border rounded-lg p-2 text-center text-white focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
                  <button type="button" disabled={editingClient.role === 'Administrador'} onClick={() => setEditingClient(p => p ? { ...p, credits: (p.credits ?? 0) + 1 } : null)} className="w-10 h-10 rounded-lg bg-forest-deep border border-forest-border flex items-center justify-center text-stone-400 hover:text-white disabled:opacity-30">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase">Plano</label>
                  <select value={editingClient.plan} onChange={e => setEditingClient({ ...editingClient, plan: e.target.value })} className="w-full bg-forest-deep border border-forest-border rounded-lg p-2 text-white focus:border-primary focus:outline-none">
                    <option>Free</option><option>Básico</option><option>Padrão</option><option>Premium</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase">Status</label>
                  <select value={editingClient.status} onChange={e => setEditingClient({ ...editingClient, status: e.target.value })} className="w-full bg-forest-deep border border-forest-border rounded-lg p-2 text-white focus:border-primary focus:outline-none">
                    <option>Ativo</option><option>Inativo</option><option>Pendente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Função</label>
                <select value={editingClient.role} onChange={e => setEditingClient({ ...editingClient, role: e.target.value })} className="w-full bg-forest-deep border border-forest-border rounded-lg p-2 text-white focus:border-primary focus:outline-none">
                  <option value="Cliente">Cliente</option><option value="Administrador">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setEditingClient(null)} className="flex-1 py-2 rounded-lg border border-forest-border text-stone-400 font-bold hover:text-white">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-primary text-white font-bold hover:bg-secondary shadow-lg shadow-primary/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header + tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Configurações</h1>
          <p className="text-stone-400">Gerencie seu perfil e as preferências do sistema.</p>
        </div>
        <div className="flex bg-forest-surface p-1 rounded-xl border border-forest-border overflow-x-auto max-w-full">
          {(['profile', 'connections', 'payments', ...(isAdmin ? ['admin'] : [])] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>
              {tab === 'profile' ? 'Meu Perfil' : tab === 'connections' ? <><span className="material-symbols-outlined text-[18px]">api</span>Conexões API</> : tab === 'payments' ? <><span className="material-symbols-outlined text-[18px]">receipt_long</span>Pagamentos</> : 'Administração'}
            </button>
          ))}
        </div>
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-forest-surface border border-forest-border rounded-2xl p-6 flex flex-col items-center text-center">
              <label className="relative w-32 h-32 rounded-full border-4 border-forest-deep overflow-hidden mb-4 cursor-pointer group block">
                <img src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${userInfo.name}`} alt="Profile" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                  <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                  <span className="text-[10px] font-bold uppercase">Trocar Foto</span>
                </div>
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} />
              </label>
              <h2 className="text-xl font-bold text-white mb-1">{userInfo.name}</h2>
              <p className="text-xs text-stone-500 mb-2">{userInfo.email}</p>
              <span className={`px-3 py-1 text-xs font-bold rounded-full mb-6 ${isAdmin ? 'bg-primary/20 text-primary' : 'bg-stone-500/20 text-stone-400'}`}>
                {isAdmin ? 'Administrador' : 'Usuário'}
              </span>
              <div className="w-full space-y-3">
                <div className="flex justify-between text-sm py-2 border-b border-forest-border">
                  <span className="text-stone-500">Status</span>
                  <span className="text-green-500 font-bold">Ativo</span>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-forest-surface border border-forest-border rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">manage_accounts</span>Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase">Nome de Exibição</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-forest-deep border border-forest-border rounded-lg p-3 text-white focus:border-primary focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-forest-deep border border-forest-border rounded-lg p-3 text-white focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50">
                  {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connections tab */}
      {activeTab === 'connections' && (
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-forest-surface border border-forest-border rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Google Gemini (AI PRO)</h2>
                <p className="text-sm text-stone-400">Motor de IA para importação de currículos em PDF.</p>
              </div>
            </div>
            <div className="mt-4 border-t border-forest-border pt-4">
              <button onClick={handleTestGemini} disabled={isTestingAi} className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all border border-blue-600/30 text-sm font-bold">
                {isTestingAi
                  ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  : <span className="material-symbols-outlined text-[18px]">play_arrow</span>}
                Testar Conexão IA (gemini-3-flash-preview)
              </button>
              {aiTestResult && (
                <div className="mt-3 p-3 bg-forest-deep rounded-lg border border-forest-border">
                  <p className="text-xs text-stone-500 mb-1 font-bold uppercase">Resposta da IA:</p>
                  <p className="text-sm text-stone-300 font-mono">{aiTestResult}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-forest-surface border border-forest-border rounded-2xl p-6">
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase block mb-1">De</label>
                <input type="date" value={paymentsFrom} onChange={e => setPaymentsFrom(e.target.value)} className="bg-forest-deep border border-forest-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase block mb-1">Até</label>
                <input type="date" value={paymentsTo} onChange={e => setPaymentsTo(e.target.value)} className="bg-forest-deep border border-forest-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none" />
              </div>
              <button onClick={fetchPayments} className="px-4 py-2 bg-forest-border/50 text-stone-200 rounded-lg font-bold text-sm hover:bg-forest-border transition-colors">
                Filtrar
              </button>
              <button onClick={handleExportPayments} disabled={isExportingPayments} className="ml-auto px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">download</span>
                {isExportingPayments ? 'Exportando...' : 'Exportar CSV'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-forest-border text-left text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Plano</th>
                    <th className="py-2 pr-4">Valor</th>
                    <th className="py-2 pr-4">Método</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-stone-500 text-xs">Nenhum pagamento encontrado.</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} className="border-t border-forest-border/50">
                      <td className="py-3 pr-4 text-stone-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 pr-4 text-stone-200">{p.plan}</td>
                      <td className="py-3 pr-4 text-stone-200 font-bold">{formatCents(p.amount, p.currency)}</td>
                      <td className="py-3 pr-4 text-stone-400">{formatMethod(p.method)}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {formatStatus(p.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin tab */}
      {activeTab === 'admin' && isAdmin && (
        <div className="bg-forest-surface border border-forest-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-forest-deep text-xs font-bold text-stone-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Créditos</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-border">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-forest-deep/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-forest-deep border border-forest-border flex items-center justify-center overflow-hidden">
                          {client.avatar ? <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-xs">person</span>}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{client.name}</p>
                          <p className="text-xs text-stone-500">{client.email}</p>
                        </div>
                        {client.role === 'Administrador' && <span className="material-symbols-outlined text-primary text-[14px]" title="Admin">verified_user</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-400">{client.plan}</td>
                    <td className="px-6 py-4 text-sm text-stone-400">{client.role === 'Administrador' ? '∞' : client.credits}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${client.status === 'Ativo' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{client.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingClient({ ...client })} className="p-1 rounded hover:bg-forest-border text-stone-500 hover:text-white">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => requestDelete(client)} className="p-1 rounded hover:bg-red-900/20 text-stone-500 hover:text-red-500">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
