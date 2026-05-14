import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AnimatedPresence from '../AnimatedPresence';
import { MagicCard } from '../magicui/magic-card';
// MagicCard 官方版本来自 https://magicui.design/docs/components/magic-card

interface LoginProps {
  isOpen: boolean;
  onClose?: () => void;
  onLogin?: () => void;
}

export default function Login({ isOpen, onClose, onLogin }: LoginProps) {
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    if (activeTab === 'register' && !fullName) {
      setError('请填写姓名');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      if (activeTab === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName || undefined);
      }
      onLogin?.();
      onClose?.();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || '操作失败，请重试';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <AnimatedPresence
      show={isOpen}
      duration={200}
      enterFrom="opacity-0 backdrop-blur-[0px] bg-black/0"
      enterTo="opacity-100 backdrop-blur-sm bg-black/60"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* 点击背景关闭 */}
      <div className="absolute inset-0" onClick={onClose} />

      <MagicCard
        className="w-full max-w-[400px] rounded-2xl shadow-2xl"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        }}
      >
        <div className="relative z-40 p-8">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 标题 */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              {activeTab === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {activeTab === 'login'
                ? 'Enter your credentials to access your account'
                : 'Enter your details to create a new account'}
            </p>
          </div>

          {/* Tab 切换 — Pills */}
          <div className="flex p-1 bg-muted/50 rounded-xl mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setActiveTab('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'register'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setActiveTab('register'); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth 登录 */}
          <div className="space-y-2.5 mb-6">
            <button
              onClick={() => { window.location.href = '/api/v1/auth/oauth/google'; }}
              className="w-full h-10 flex items-center justify-center gap-2.5 border border-border/60 rounded-xl hover:bg-accent/50 transition-colors text-sm font-medium text-secondary-foreground"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => { window.location.href = '/api/v1/auth/oauth/github'; }}
              className="w-full h-10 flex items-center justify-center gap-2.5 border border-border/60 rounded-xl hover:bg-accent/50 transition-colors text-sm font-medium text-secondary-foreground"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* 分隔线 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-muted-foreground bg-transparent">
                or continue with email
              </span>
            </div>
          </div>

          {/* 表单 */}
          <div className="space-y-4" onKeyDown={handleKeyDown}>
            {/* 姓名（注册时显示） */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                activeTab === 'register'
                  ? 'max-h-[76px] opacity-100'
                  : 'max-h-0 opacity-0'
              }`}
            >
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-11 px-4 bg-transparent border border-border/60 rounded-xl focus:border-foreground/40 focus:ring-0 outline-none placeholder:text-muted-foreground/60 text-foreground text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 px-4 bg-transparent border border-border/60 rounded-xl focus:border-foreground/40 focus:ring-0 outline-none placeholder:text-muted-foreground/60 text-foreground text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={activeTab === 'login' ? 'Enter your password' : 'Create a password'}
                className="w-full h-11 px-4 bg-transparent border border-border/60 rounded-xl focus:border-foreground/40 focus:ring-0 outline-none placeholder:text-muted-foreground/60 text-foreground text-sm transition-colors"
              />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 text-destructive text-sm">{error}</div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-11 mt-6 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading
              ? 'Please wait...'
              : activeTab === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>

          {/* 底部条款 */}
          <p className="text-center text-xs text-muted-foreground mt-5 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors">Privacy Policy</a>
          </p>
        </div>
      </MagicCard>
    </AnimatedPresence>
  );
}
