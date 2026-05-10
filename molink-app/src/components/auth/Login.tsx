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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-[440px] shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between pt-6 px-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Log in</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
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
                ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white'
                : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-500 dark:hover:text-gray-400'
            }`}
            onClick={() => setActiveTab('login')}
          >
            登录
          </button>
          <button
            className={`pb-3 text-[15px] font-medium border-b-2 transition-colors ${
              activeTab === 'register'
                ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white'
                : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-500 dark:hover:text-gray-400'
            }`}
            onClick={() => setActiveTab('register')}
          >
            注册
          </button>
        </div>

        <div className="p-8 pt-6">
          <p className="text-gray-500 dark:text-gray-400 text-[15px] mb-6">
            {activeTab === 'login' 
              ? '欢迎回来' 
              : '创建你的账号'
            }
          </p>

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
              className="w-full relative h-11 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/google-color.svg" alt="Google" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-gray-700 dark:text-gray-300">
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
              className="w-full relative h-11 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/github.svg" alt="GitHub" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-gray-700 dark:text-gray-300">
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
              className="w-full relative h-11 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <img src="/src/assets/images/microsoft-color.svg" alt="Microsoft" className="w-5 h-5" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-gray-700 dark:text-gray-300">
                Continue with Microsoft
              </span>
            </button>
          </div>

          {/* 分隔线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900">
                或使用邮箱{activeTab === 'login' ? '登录' : '注册'}
              </span>
            </div>
          </div>

          {/* 表单 */}
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-[15px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-11 px-3.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[15px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={activeTab === 'login' ? '输入密码' : '设置密码'}
                className="w-full h-11 px-3.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-red-500 text-[15px]">{error}</div>
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
              className="w-full h-11 bg-gray-900 dark:bg-gray-700 text-white text-[15px] font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? '处理中...' : (activeTab === 'login' ? '登录' : '注册')}
            </button>
          </form>

          {/* 其他登录选项 */}
          <div className="mt-5 text-center">
            <button className="text-[15px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              使用单点登录 (SSO)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
