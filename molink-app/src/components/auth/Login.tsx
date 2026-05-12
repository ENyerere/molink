import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AnimatedPresence from '../AnimatedPresence';

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

  return (
    <AnimatedPresence
      show={isOpen}
      duration={200}
      enterFrom="opacity-0 backdrop-blur-[0px] bg-black/0"
      enterTo="opacity-100 backdrop-blur-sm bg-black/60"
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div
        className="bg-card rounded-xl w-full max-w-[440px] shadow-2xl transition-all duration-200 ease-out"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between pt-8 px-8">
          <div>
            <h2 className="text-3xl font-bold text-card-foreground">你的 AI 工作空间。</h2>
            <p className="text-muted-foreground mt-1">登录你的 Molink 帐号</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex mt-6 px-8 relative">
          <button
            className={`mr-8 pb-3 text-[15px] font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'login'
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            登录
          </button>
          <button
            className={`pb-3 text-[15px] font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'register'
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            注册
          </button>
        </div>

        <div className="p-8 pt-6">
          {/* 第三方登录（占位） */}
          <div className="space-y-2.5">
            <button disabled className="w-full relative h-11 border border-border rounded-lg opacity-50 cursor-not-allowed">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/google-color.svg" alt="Google" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-muted-foreground">
                Google 登录（暂未接入）
              </span>
            </button>
            <button disabled className="w-full relative h-11 border border-border rounded-lg opacity-50 cursor-not-allowed">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/github.svg" alt="GitHub" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-muted-foreground">
                GitHub 登录（暂未接入）
              </span>
            </button>
          </div>

          {/* 分隔线 */}
          <div className="relative mt-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-muted-foreground bg-card transition-opacity duration-200">
                或使用邮箱{activeTab === 'login' ? '登录' : '注册'}
              </span>
            </div>
          </div>

          {/* 姓名输入框 - 可折叠 */}
          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${
              activeTab === 'register'
                ? 'max-h-[88px] opacity-100 mt-5'
                : 'max-h-0 opacity-0 mt-0'
            }`}
          >
            <label className="block text-[15px] font-medium text-foreground mb-2">
              姓名
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="你的名字"
              className="w-full h-11 px-3.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary outline-none placeholder:text-muted-foreground bg-input text-foreground"
            />
          </div>

          <div className="mt-5">
            <label className="block text-[15px] font-medium text-foreground mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full h-11 px-3.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary outline-none placeholder:text-muted-foreground bg-input text-foreground"
            />
          </div>

          <div className="mt-5">
            <label className="block text-[15px] font-medium text-foreground mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={activeTab === 'login' ? '输入密码' : '设置密码（至少6位）'}
              className="w-full h-11 px-3.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary outline-none placeholder:text-muted-foreground bg-input text-foreground"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-5 text-destructive text-[15px]">{error}</div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-11 bg-primary text-primary-foreground text-[15px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-5"
          >
            {isLoading ? '处理中...' : '继续'}
          </button>

          {/* 底部条款 */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            继续操作即表示你确认已理解并同意
            <a href="#" className="text-primary hover:underline">条款和条件</a>
            和
            <a href="#" className="text-primary hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </AnimatedPresence>
  );
}
