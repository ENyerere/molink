import { useState } from 'react';
import type { User } from '../../App';
import { auth } from '../../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from 'firebase/auth';

/** 检查 Firebase 是否已配置（非占位符） */
function isFirebaseConfigured(): boolean {
  // @ts-ignore
  return auth?.app?.options?.apiKey && auth.app.options.apiKey !== 'YOUR_API_KEY';
}

interface LoginProps {
  onClose?: () => void;
  onLogin?: (user: User) => void;
}

export default function Login({ onClose, onLogin }: LoginProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-xl w-full max-w-[440px] shadow-2xl">
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
        <div className="flex mt-6 px-8">
          <button
            className={`mr-8 pb-3 text-[15px] font-medium border-b-2 transition-colors ${
              activeTab === 'login'
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
            onClick={() => setActiveTab('login')}
          >
            登录
          </button>
          <button
            className={`pb-3 text-[15px] font-medium border-b-2 transition-colors ${
              activeTab === 'register'
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
            onClick={() => setActiveTab('register')}
          >
            注册
          </button>
        </div>

        <div className="p-8 pt-6">
          {/* 登录选项 */}
          {/* 第三方登录按钮 */}
          <div className="space-y-2.5">
            <button
              onClick={async () => {
                if (!isFirebaseConfigured()) {
                  setError('第三方登录尚未配置。请在 src/lib/firebase.ts 中填写 Firebase 配置，或使用邮箱登录。');
                  return;
                }
                try {
                  setIsLoading(true);
                  setError('');
                  const provider = new GoogleAuthProvider();
                  const result = await signInWithPopup(auth, provider);
                  if (onLogin) {
                    onLogin({
                      id: result.user.uid,
                      name: result.user.displayName || 'User',
                      email: result.user.email || '',
                      avatar: result.user.photoURL || undefined
                    });
                  }
                  onClose?.();
                } catch (err) {
                  setError('Google 登录失败，请重试');
                  console.error(err);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full relative h-11 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/google-color.svg" alt="Google" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-foreground">
                Continue with Google
              </span>
            </button>

            <button
              onClick={async () => {
                if (!isFirebaseConfigured()) {
                  setError('第三方登录尚未配置。请在 src/lib/firebase.ts 中填写 Firebase 配置，或使用邮箱登录。');
                  return;
                }
                try {
                  setIsLoading(true);
                  setError('');
                  const provider = new GithubAuthProvider();
                  const result = await signInWithPopup(auth, provider);
                  if (onLogin) {
                    onLogin({
                      id: result.user.uid,
                      name: result.user.displayName || 'User',
                      email: result.user.email || '',
                      avatar: result.user.photoURL || undefined
                    });
                  }
                  onClose?.();
                } catch (err) {
                  setError('GitHub 登录失败，请重试');
                  console.error(err);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full relative h-11 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/github.svg" alt="GitHub" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-foreground">
                Continue with GitHub
              </span>
            </button>

            <button
              onClick={async () => {
                if (!isFirebaseConfigured()) {
                  setError('第三方登录尚未配置。请在 src/lib/firebase.ts 中填写 Firebase 配置，或使用邮箱登录。');
                  return;
                }
                try {
                  setIsLoading(true);
                  setError('');
                  const provider = new OAuthProvider('microsoft.com');
                  provider.setCustomParameters({ prompt: 'select_account' });
                  const result = await signInWithPopup(auth, provider);
                  if (onLogin) {
                    onLogin({
                      id: result.user.uid,
                      name: result.user.displayName || 'User',
                      email: result.user.email || '',
                      avatar: result.user.photoURL || undefined
                    });
                  }
                  onClose?.();
                } catch (err) {
                  setError('Microsoft 登录失败，请重试');
                  console.error(err);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full relative h-11 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/microsoft-color.svg" alt="Microsoft" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-foreground">
                Continue with Microsoft
              </span>
            </button>

            <button
              disabled={isLoading}
              className="w-full relative h-11 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-foreground">
                单点登录 (SSO)
              </span>
            </button>
          </div>

          {/* 分隔线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-muted-foreground bg-card">
                或使用邮箱{activeTab === 'login' ? '登录' : '注册'}
              </span>
            </div>
          </div>

          {/* 表单 */}
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-[15px] font-medium text-foreground mb-2">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-11 px-3.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary outline-none placeholder:text-muted-foreground bg-input text-foreground"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[15px] font-medium text-foreground mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={activeTab === 'login' ? '输入密码' : '设置密码'}
                className="w-full h-11 px-3.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary outline-none placeholder:text-muted-foreground bg-input text-foreground"
                required
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-destructive text-[15px]">{error}</div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              onClick={async () => {
                if (!email || !password) {
                  setError('请填写邮箱和密码');
                  return;
                }
                try {
                  setIsLoading(true);
                  setError('');
                  if (activeTab === 'login') {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    if (onLogin) {
                      onLogin({
                        id: result.user.uid,
                        name: result.user.displayName || email.split('@')[0],
                        email: result.user.email || '',
                        avatar: result.user.photoURL || undefined
                      });
                    }
                  } else {
                    const result = await createUserWithEmailAndPassword(auth, email, password);
                    if (onLogin) {
                      onLogin({
                        id: result.user.uid,
                        name: email.split('@')[0],
                        email: result.user.email || '',
                        avatar: undefined
                      });
                    }
                  }
                  onClose?.();
                } catch (err: any) {
                  if (activeTab === 'login') {
                    setError('登录失败，请检查邮箱和密码');
                  } else {
                    setError('注册失败，该邮箱可能已被使用');
                  }
                  console.error(err);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full h-11 bg-primary text-primary-foreground text-[15px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? '处理中...' : '继续'}
            </button>
          </form>

          {/* 底部条款 */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            继续操作即表示你确认已理解并同意
            <a href="#" className="text-primary hover:underline">条款和条件</a>
            和
            <a href="#" className="text-primary hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}
