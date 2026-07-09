import React, { useState, useEffect } from 'react';
import { compressImage } from '../services/resumeService';
import { useAuth } from './AuthProvider';

const Auth: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin]           = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading]       = useState(false);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const compressed = await compressImage(e.target.files[0], 300);
        setAvatarPreview(compressed);
      } catch {
        setNotification({ message: 'Erro ao processar a imagem.', type: 'error' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(email)) {
      setNotification({ message: 'Insira um e-mail válido.', type: 'error' }); return;
    }
    if (!isLogin && name.trim().length < 2) {
      setNotification({ message: 'O nome deve ter pelo menos 2 caracteres.', type: 'error' }); return;
    }
    if (password.length < 6) {
      setNotification({ message: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' }); return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        setNotification({ message: 'Login realizado com sucesso!', type: 'success' });
      } else {
        await register(name.trim(), email, password, avatarPreview ?? undefined);
        setNotification({ message: 'Cadastro realizado com sucesso!', type: 'success' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Erro ao autenticar.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-forest-deep flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-forest-border/20 rounded-full blur-[100px]"></div>

      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border backdrop-blur-md ${
          notification.type === 'success'
            ? 'bg-forest-deep/90 border-green-500/30 text-green-400'
            : 'bg-red-950/90 border-red-500 text-red-200'
        }`}>
          <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <span className="material-symbols-outlined">{notification.type === 'success' ? 'check' : 'warning'}</span>
          </div>
          <div>
            <p className="font-bold text-sm">Autenticação</p>
            <p className="text-xs opacity-90">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-2 bg-forest-base border border-forest-border rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px]">

        {/* Left side */}
        <div className="relative hidden lg:block h-full group">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVTQjvn5pw7F16NtbZJazism-82cseCfUwf17qtOpD4RSGdSHsZJC3vhz3HVnZXeJNk6KyK45D4s_yqHcIXJSHzOHZnegDU_GyMcOPGqqJ50lhFWxQ2sp2UqRpXk6gssUwoy3ONYkizBSZO-W_K1Ub5NGMihuPr1Ox9UnmQFWUcWbEhSBjgl1VtDHA3nQowx_vYG9y3Souc64Z1bnoExOyNqinXFs9BnCCMAjd4UoCjKCLvbekzd1kEb5-BQFYVHbwP8iXq-0FW0Pd"
            alt="Abstract Design"
            className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-12 w-full z-10">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-forest-surface/30 backdrop-blur-md border border-white/10 shadow-lg mb-6">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
            </div>
            <h2 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
              Construa sua identidade profissional.
            </h2>
            <p className="text-stone-400 text-lg font-light leading-relaxed">
              Crie currículos modernos, únicos e com modo escuro que otimizam sua apresentação com telas eficientes e criativas.
            </p>
          </div>
        </div>

        {/* Right side — form */}
        <div className="flex flex-col h-full bg-forest-surface/30 backdrop-blur-sm p-8 lg:p-12 justify-center">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">CVFacil.NG</h1>
            <p className="text-stone-500 text-sm">Bem-vindo de volta!</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Conectado</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-forest-border mb-8">
            <button
              onClick={() => { setIsLogin(true); setNotification(null); }}
              className={`flex-1 pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
                isLogin ? 'border-primary text-white' : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setNotification(null); }}
              className={`flex-1 pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
                !isLogin ? 'border-primary text-white' : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              Cadastro
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Foto */}
            <div className="flex flex-col items-center justify-center pt-2">
              <label className="relative w-32 aspect-[3/4] bg-forest-deep border-2 border-dashed border-forest-border rounded-xl flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary hover:bg-forest-surface/50 transition-all group shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-stone-500 group-hover:text-primary transition-colors p-2 text-center">
                    <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                    <span className="text-[10px] font-bold uppercase leading-tight">Carregar Foto<br />3x4</span>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} />
              </label>
              <span className="text-[10px] text-stone-500 mt-2 uppercase font-bold tracking-wider">Foto do Perfil (3x4)</span>
              <span className="text-[10px] text-stone-600 uppercase">Formatos aceitos: JPG, PNG ou WEBP</span>
            </div>

            {/* Nome (apenas cadastro) */}
            {!isLogin && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <label className="text-xs font-bold text-stone-400 uppercase">Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3 text-stone-500 text-[20px]">person</span>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Seu Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-forest-deep border border-forest-border rounded-lg py-3 pl-10 pr-4 text-stone-200 focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-stone-500 text-[20px]">mail</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-forest-deep border border-forest-border rounded-lg py-3 pl-10 pr-4 text-stone-200 focus:border-primary focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase">Senha</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-stone-500 text-[20px]">lock</span>
                <input
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-forest-deep border border-forest-border rounded-lg py-3 pl-10 pr-4 text-stone-200 focus:border-primary focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-secondary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
                  <span className="material-symbols-outlined text-[20px]">{isLogin ? 'login' : 'person_add'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="#" className="text-xs text-primary hover:text-white transition-colors uppercase tracking-wider font-bold">
              Esqueceu sua senha?
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 text-center text-[10px] text-stone-600 uppercase tracking-widest w-full">
        © 2024 CVFacil.NG. Todos os direitos reservados.
      </div>
    </div>
  );
};

export default Auth;
