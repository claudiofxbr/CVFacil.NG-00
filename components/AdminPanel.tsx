'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, downloadFile } from '../lib/apiClient';
import { useAuth } from './AuthProvider';

interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
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

const formatPaymentStatus = (status: string) =>
  status === 'paid' ? 'Pago' : status === 'failed' ? 'Falhou' : status;

// ─── Tipos locais ────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Cliente';
  plan?: string;
  status?: string;
  credits?: number;
  last_login?: string;
  avatar?: string;
  isPinned?: boolean;
}

interface AdminStats {
  totalUsers: number;
  totalResumes: number;
  estimatedRevenue: number;
  recentUsers: AdminUser[];
}

interface Notification {
  message: string;
  type: 'success' | 'error';
}

const PLAN_PRICES: Record<string, number> = {
  Premium: 90,
  Padrão: 40,
  Básico: 15,
  Free: 0,
};


// ─── Helpers ─────────────────────────────────────────────────────────────────

const calcRevenue = (users: AdminUser[]) =>
  users.reduce((sum, u) => sum + (PLAN_PRICES[u.plan ?? 'Free'] ?? 0), 0);

const formatDate = (str?: string) => {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const formatRelative = (str?: string) => {
  if (!str) return '—';
  const diff = Math.floor((Date.now() - new Date(str).getTime()) / 60000);
  if (diff < 1) return 'Agora mesmo';
  if (diff < 60) return `${diff}min atrás`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`;
  return `${Math.floor(diff / 1440)}d atrás`;
};

// ─── Componente ───────────────────────────────────────────────────────────────

const AdminPanel: React.FC = () => {
  useAuth(); // acesso ao contexto para garantir re-render em mudanças de auth

  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalResumes: 0, estimatedRevenue: 0, recentUsers: [] });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [planFilter, setPlanFilter] = useState<string>('Todos');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [userToGrantCredits, setUserToGrantCredits] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState<number>(1);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  const [activeSection, setActiveSection] = useState<'users' | 'payments'>('users');
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentsUserFilter, setPaymentsUserFilter] = useState('');
  const [paymentsFrom, setPaymentsFrom] = useState('');
  const [paymentsTo, setPaymentsTo] = useState('');
  const [isExportingPayments, setIsExportingPayments] = useState(false);

  // ── Notificação automática ──────────────────────────────────────────────────
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  // ── Carregar dados ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { users: list } = await api.get('/api/users?limit=200');
      setUsers(list as AdminUser[]);
      setStats({
        totalUsers: list.length,
        totalResumes: 0,
        estimatedRevenue: calcRevenue(list as AdminUser[]),
        recentUsers: (list as AdminUser[]).slice(0, 5),
      });
    } catch {
      setNotification({ message: 'Erro ao carregar dados do painel.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Pagamentos (extrato de todos os usuários) ────────────────────────────────
  const fetchPayments = async () => {
    try {
      const qs = new URLSearchParams();
      if (paymentsUserFilter) qs.set('userId', paymentsUserFilter);
      if (paymentsFrom) qs.set('from', paymentsFrom);
      if (paymentsTo) qs.set('to', paymentsTo);
      const { payments: rows } = await api.get(`/api/admin/payments?${qs.toString()}`);
      setPayments(rows);
    } catch {
      setNotification({ message: 'Erro ao carregar pagamentos.', type: 'error' });
    }
  };

  useEffect(() => {
    if (activeSection === 'payments') fetchPayments();
  }, [activeSection]);

  const handleExportPayments = async () => {
    setIsExportingPayments(true);
    try {
      const qs = new URLSearchParams();
      if (paymentsUserFilter) qs.set('userId', paymentsUserFilter);
      if (paymentsFrom) qs.set('from', paymentsFrom);
      if (paymentsTo) qs.set('to', paymentsTo);
      qs.set('format', 'csv');
      await downloadFile(`/api/admin/payments?${qs.toString()}`, 'pagamentos-cvfacil-admin.csv');
    } catch {
      setNotification({ message: 'Erro ao exportar pagamentos.', type: 'error' });
    } finally {
      setIsExportingPayments(false);
    }
  };

  // ── Filtros ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let list = [...users];
    if (search) list = list.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'Todos') list = list.filter(u => u.status === statusFilter);
    if (planFilter !== 'Todos') list = list.filter(u => u.plan === planFilter);
    setFilteredUsers(list);
    setCurrentPage(1);
  }, [search, statusFilter, planFilter, users]);

  const pagedUsers = filteredUsers.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));

  // ── Ações ───────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/api/users/${editingUser.id}`, editingUser);
      setEditingUser(null);
      setNotification({ message: 'Usuário atualizado com sucesso.', type: 'success' });
      loadData();
    } catch {
      setNotification({ message: 'Erro ao atualizar usuário.', type: 'error' });
    }
  };

  const handleGrantCredits = async () => {
    if (!userToGrantCredits || !Number.isInteger(grantAmount) || grantAmount <= 0) return;
    try {
      await api.post(`/api/users/${userToGrantCredits.id}/credits`, { amount: grantAmount });
      setUserToGrantCredits(null);
      setGrantAmount(1);
      setNotification({ message: `${grantAmount} crédito(s) concedido(s) a ${userToGrantCredits.name}.`, type: 'success' });
      loadData();
    } catch {
      setNotification({ message: 'Erro ao conceder créditos.', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.role === 'Administrador') {
      setNotification({ message: 'Administradores não podem ser excluídos.', type: 'error' });
      setUserToDelete(null);
      return;
    }
    try {
      await api.delete(`/api/users/${userToDelete.id}`);
      setUserToDelete(null);
      setNotification({ message: 'Usuário removido com sucesso.', type: 'success' });
      loadData();
    } catch {
      setNotification({ message: 'Erro ao remover usuário.', type: 'error' });
    }
  };

  const exportCsv = () => {
    const header = 'Nome,Email,Plano,Status,Último Acesso';
    const rows = users.map(u => `"${u.name}","${u.email}","${u.plan ?? ''}","${u.status ?? ''}","${formatDate(u.last_login)}"`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'relatorio-cvfacil.csv'; a.click();
    URL.revokeObjectURL(url);
    setNotification({ message: 'Relatório CSV exportado!', type: 'success' });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 relative">

      {/* Toast */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5 duration-300 border backdrop-blur-md ${
          notification.type === 'success' ? 'bg-forest-deep/90 border-green-500/30 text-green-400' : 'bg-red-950/90 border-red-500 text-red-200'
        }`}>
          <span className="material-symbols-outlined">{notification.type === 'success' ? 'check_circle' : 'warning'}</span>
          <p className="text-sm font-bold">{notification.message}</p>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">Painel Administrativo</h1>
          <p className="text-stone-400 text-sm mt-1">Acompanhe as métricas e gerencie os usuários em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-forest-surface p-1 rounded-xl border border-forest-border">
            {(['users', 'payments'] as const).map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeSection === section ? 'bg-primary text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}
              >
                {section === 'users' ? 'Usuários' : 'Pagamentos'}
              </button>
            ))}
          </div>
          {activeSection === 'users' && (
            <button
              onClick={exportCsv}
              className="px-5 py-2.5 bg-primary hover:bg-secondary text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-primary/20 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportar Relatório
            </button>
          )}
        </div>
      </div>

      {activeSection === 'users' && (
      <>
      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Usuários Registrados', value: stats.totalUsers.toLocaleString('pt-BR'), icon: 'group', color: 'text-blue-400', bg: 'bg-blue-500/10', delta: '+12%' },
          { label: 'Currículos Criados', value: stats.totalResumes.toLocaleString('pt-BR'), icon: 'description', color: 'text-emerald-400', bg: 'bg-emerald-500/10', delta: '+8%' },
          { label: 'Receita Estimada', value: `R$ ${stats.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'payments', color: 'text-primary', bg: 'bg-primary/10', delta: '+5%' },
        ].map(card => (
          <div key={card.label} className="bg-forest-surface border border-forest-border rounded-2xl p-6 flex items-center gap-5 hover:border-primary/30 transition-all">
            <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined text-[28px] ${card.color}`}>{card.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-2xl font-display font-bold text-white truncate">{isLoading ? '…' : card.value}</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">{card.delta}</span>
          </div>
        ))}
      </div>

      {/* ── Usuários Recentes ─────────────────────────────────────────────────── */}
      <div className="bg-forest-surface border border-forest-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-forest-border flex justify-between items-center">
          <h2 className="text-base font-display font-bold text-white">Usuários Recentes</h2>
          <span className="text-xs text-stone-500">Ver todos ↓</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Nome</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500 hidden md:table-cell">Email</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Data</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentUsers.map(u => (
              <tr key={u.id} className="border-t border-forest-border/50 hover:bg-forest-border/20 transition-colors">
                <td className="px-6 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 overflow-hidden">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      : u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-stone-200 truncate max-w-[120px]">{u.name}</span>
                </td>
                <td className="px-6 py-3 text-stone-400 hidden md:table-cell">{u.email}</td>
                <td className="px-6 py-3 text-stone-500 text-xs">{formatRelative(u.last_login)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Gerenciamento de Usuários ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-display font-bold text-white">Gerenciamento de Usuários</h2>
            <p className="text-stone-400 text-xs mt-1">Visualize, gerencie e edite o acesso dos seus usuários.</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-forest-surface border border-forest-border rounded-xl text-stone-300 hover:border-primary/50 transition-all flex items-center gap-2 text-sm font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-forest-surface border border-forest-border rounded-xl pl-10 pr-4 py-2.5 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-forest-surface border border-forest-border rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="Todos">Status: Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="bg-forest-surface border border-forest-border rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="Todos">Plano: Todos</option>
            <option value="Premium">Premium</option>
            <option value="Padrão">Padrão</option>
            <option value="Básico">Básico</option>
            <option value="Free">Free</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="bg-forest-surface border border-forest-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest-border bg-forest-deep/30">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500">Usuário</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500 hidden lg:table-cell">Email</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500">Status</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500 hidden md:table-cell">Plano</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500 hidden lg:table-cell">Créditos</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-500 hidden xl:table-cell">Último Acesso</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-stone-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-forest-border/30">
                        {[1, 2, 3, 4, 5, 6, 7].map(j => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-forest-border/30 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : pagedUsers.map(u => (
                      <tr key={u.id} className="border-t border-forest-border/30 hover:bg-forest-border/10 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0 overflow-hidden">
                              {u.avatar
                                ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                : u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-stone-200 text-xs">{u.name}</p>
                              {u.role === 'Administrador' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-stone-400 text-xs hidden lg:table-cell">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                            u.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {u.status ?? 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                            u.plan === 'Premium' ? 'bg-purple-500/20 text-purple-300' :
                            u.plan === 'Padrão' ? 'bg-blue-500/20 text-blue-300' :
                            u.plan === 'Básico' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-stone-500/20 text-stone-400'
                          }`}>
                            {u.plan ?? 'Free'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-xs font-bold hidden lg:table-cell ${(u.credits ?? 0) < 0 ? 'text-red-400' : 'text-stone-300'}`}>
                          {u.credits ?? 0}
                        </td>
                        <td className="px-6 py-4 text-stone-500 text-xs hidden xl:table-cell">{formatDate(u.last_login)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setUserToGrantCredits(u); setGrantAmount(1); }}
                              className="w-8 h-8 rounded-lg bg-forest-border/50 text-stone-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors flex items-center justify-center"
                              title="Conceder créditos"
                            >
                              <span className="material-symbols-outlined text-[16px]">add_card</span>
                            </button>
                            <button
                              onClick={() => setEditingUser({ ...u })}
                              className="w-8 h-8 rounded-lg bg-forest-border/50 text-stone-400 hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex items-center justify-center"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="w-8 h-8 rounded-lg bg-forest-border/50 text-stone-400 hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center"
                              title="Remover"
                              disabled={u.role === 'Administrador'}
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {filteredUsers.length > 0 && (
            <div className="px-6 py-3 border-t border-forest-border/30 flex items-center justify-between text-xs text-stone-500">
              <span>Mostrando {(currentPage - 1) * PER_PAGE + 1} — {Math.min(currentPage * PER_PAGE, filteredUsers.length)} de {filteredUsers.length} resultados</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 rounded-lg bg-forest-border/30 hover:bg-forest-border transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                  Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1)
                ).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${p === currentPage ? 'bg-primary text-white' : 'bg-forest-border/30 text-stone-400 hover:bg-forest-border'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 rounded-lg bg-forest-border/30 hover:bg-forest-border transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {activeSection === 'payments' && (
        <div className="bg-forest-surface border border-forest-border rounded-2xl p-6">
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase block mb-1">Usuário (ID)</label>
              <input
                type="text"
                placeholder="Deixe em branco para todos"
                value={paymentsUserFilter}
                onChange={e => setPaymentsUserFilter(e.target.value)}
                className="bg-forest-deep border border-forest-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none w-56"
              />
            </div>
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
                  <th className="py-2 pr-4">Usuário</th>
                  <th className="py-2 pr-4">Plano</th>
                  <th className="py-2 pr-4">Valor</th>
                  <th className="py-2 pr-4">Método</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-stone-500 text-xs">Nenhum pagamento encontrado.</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="border-t border-forest-border/50">
                    <td className="py-3 pr-4 text-stone-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 pr-4">
                      <p className="text-stone-200 font-bold">{p.userName}</p>
                      <p className="text-stone-500 text-xs">{p.userEmail}</p>
                    </td>
                    <td className="py-3 pr-4 text-stone-300">{p.plan}</td>
                    <td className="py-3 pr-4 text-stone-200 font-bold">{formatCents(p.amount, p.currency)}</td>
                    <td className="py-3 pr-4 text-stone-400">{formatMethod(p.method)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {formatPaymentStatus(p.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Editar ──────────────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-forest-surface border border-forest-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-forest-border flex justify-between items-center">
              <h3 className="text-lg font-display font-bold text-white">Editar Usuário</h3>
              <button onClick={() => setEditingUser(null)} className="text-stone-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {([
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={editingUser[f.key] ?? ''}
                    onChange={e => setEditingUser(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                    className="w-full bg-forest-deep border border-forest-border rounded-xl px-4 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                    className="w-full bg-forest-deep border border-forest-border rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">Plano</label>
                  <select
                    value={editingUser.plan ?? 'Free'}
                    onChange={e => setEditingUser(prev => prev ? { ...prev, plan: e.target.value } : null)}
                    className="w-full bg-forest-deep border border-forest-border rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-primary/50"
                  >
                    {['Free', 'Básico', 'Padrão', 'Premium'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">Status</label>
                  <select
                    value={editingUser.status ?? 'Ativo'}
                    onChange={e => setEditingUser(prev => prev ? { ...prev, status: e.target.value } : null)}
                    className="w-full bg-forest-deep border border-forest-border rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2.5 rounded-xl border border-forest-border text-stone-400 font-bold hover:bg-forest-border/30 transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-secondary transition-colors text-sm shadow-lg shadow-primary/20">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ──────────────────────────────────────────── */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-forest-surface border border-red-900/50 rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-3xl text-red-400">person_remove</span>
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">Remover Usuário?</h3>
            <p className="text-stone-400 text-sm mb-6">
              Isso removerá <strong className="text-white">{userToDelete.name}</strong> permanentemente do sistema.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setUserToDelete(null)} className="flex-1 py-2.5 rounded-xl border border-forest-border text-stone-400 font-bold hover:bg-forest-border/30 transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors text-sm">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Conceder Créditos ───────────────────────────────────────────── */}
      {userToGrantCredits && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-forest-surface border border-forest-border rounded-2xl w-full max-w-sm shadow-2xl p-8">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-3xl text-emerald-400">add_card</span>
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2 text-center">Conceder Créditos</h3>
            <p className="text-stone-400 text-sm mb-6 text-center">
              Adicionar créditos ao saldo de <strong className="text-white">{userToGrantCredits.name}</strong> (saldo atual: {userToGrantCredits.credits ?? 0}).
            </p>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">Quantidade a conceder</label>
            <input
              type="number"
              min={1}
              step={1}
              value={grantAmount}
              onChange={e => setGrantAmount(Number(e.target.value))}
              className="w-full bg-forest-deep border border-forest-border rounded-xl px-4 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-primary/50 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setUserToGrantCredits(null)} className="flex-1 py-2.5 rounded-xl border border-forest-border text-stone-400 font-bold hover:bg-forest-border/30 transition-colors text-sm">
                Cancelar
              </button>
              <button
                onClick={handleGrantCredits}
                disabled={!Number.isInteger(grantAmount) || grantAmount <= 0}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
