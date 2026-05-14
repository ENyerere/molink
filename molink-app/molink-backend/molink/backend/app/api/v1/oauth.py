"""
OAuth 第三方登录 — 纯 httpx 手动实现，不依赖 authlib/cryptography
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse
from typing import Optional
import httpx
import secrets
import uuid

from app.core.database import get_db
from app.core.security import create_access_token
from app.core.config import settings
from app.models.user import User

router = APIRouter()

# ---------------------------------------------------------------------------
# Provider 配置
# ---------------------------------------------------------------------------
PROVIDERS = {
    'google': {
        'authorize_url': 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_url': 'https://oauth2.googleapis.com/token',
        'userinfo_url': 'https://www.googleapis.com/oauth2/v3/userinfo',
        'scope': 'openid email profile',
    },
    'github': {
        'authorize_url': 'https://github.com/login/oauth/authorize',
        'token_url': 'https://github.com/login/oauth/access_token',
        'userinfo_url': 'https://api.github.com/user',
        'emails_url': 'https://api.github.com/user/emails',
        'scope': 'user:email read:user',
    },
}


def _get_client_credentials(provider: str):
    """获取 client_id / client_secret"""
    if provider == 'google':
        return settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET
    if provider == 'github':
        return settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET
    return None, None


# ---------------------------------------------------------------------------
# 1. 发起授权
# ---------------------------------------------------------------------------
@router.get('/oauth/{provider}')
async def oauth_login(request: Request, provider: str):
    """构造授权 URL，重定向到第三方"""
    cfg = PROVIDERS.get(provider)
    client_id, client_secret = _get_client_credentials(provider)
    if not cfg or not client_id or not client_secret:
        raise HTTPException(status_code=400, detail=f'不支持的 OAuth 提供商: {provider}')

    state = secrets.token_urlsafe(32)
    request.session['oauth_state'] = state
    request.session['oauth_provider'] = provider

    redirect_uri = f'{request.base_url}api/v1/auth/oauth/{provider}/callback'

    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': cfg['scope'],
        'state': state,
    }
    # GitHub 可选加 allow_signup
    if provider == 'github':
        params['allow_signup'] = 'true'

    query = '&'.join(f'{k}={v}' for k, v in params.items())
    authorize_url = f"{cfg['authorize_url']}?{query}"
    return RedirectResponse(url=authorize_url)


# ---------------------------------------------------------------------------
# 2. 回调处理
# ---------------------------------------------------------------------------
@router.get('/oauth/{provider}/callback')
async def oauth_callback(
    request: Request,
    provider: str,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """OAuth 回调：验 state → 换 token → 取用户信息 → 创建/更新用户 → 发 JWT → 回前端"""
    if error:
        raise HTTPException(status_code=400, detail=f'OAuth 授权失败: {error}')
    if not code:
        raise HTTPException(status_code=400, detail='缺少授权码')

    # 验证 state 防 CSRF
    stored_state = request.session.get('oauth_state')
    stored_provider = request.session.get('oauth_provider')
    if not stored_state or stored_state != state or stored_provider != provider:
        raise HTTPException(status_code=400, detail='OAuth state 验证失败')

    # 清理 session
    request.session.pop('oauth_state', None)
    request.session.pop('oauth_provider', None)

    cfg = PROVIDERS.get(provider)
    client_id, client_secret = _get_client_credentials(provider)
    if not cfg or not client_id or not client_secret:
        raise HTTPException(status_code=400, detail=f'不支持的 OAuth 提供商: {provider}')

    redirect_uri = f'{request.base_url}api/v1/auth/oauth/{provider}/callback'

    # ------------------------------------------------------------------
    # Step A: 用 code 换 access_token
    # ------------------------------------------------------------------
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            cfg['token_url'],
            data={
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
            },
            headers={'Accept': 'application/json'},
        )
        token_data = token_resp.json()
        access_token = token_data.get('access_token')
        if not access_token:
            raise HTTPException(
                status_code=400,
                detail=f"无法获取 access_token: {token_data.get('error_description', token_data)}"
            )

        # ------------------------------------------------------------------
        # Step B: 获取用户信息
        # ------------------------------------------------------------------
        email: Optional[str] = None
        name: Optional[str] = None
        avatar: Optional[str] = None
        provider_id: Optional[str] = None

        if provider == 'google':
            user_resp = await client.get(
                cfg['userinfo_url'],
                headers={'Authorization': f'Bearer {access_token}'},
            )
            user_info = user_resp.json()
            email = user_info.get('email')
            name = user_info.get('name')
            avatar = user_info.get('picture')
            provider_id = user_info.get('sub')

        elif provider == 'github':
            user_resp = await client.get(
                cfg['userinfo_url'],
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/vnd.github+json',
                },
            )
            user_info = user_resp.json()
            provider_id = str(user_info.get('id'))
            name = user_info.get('name') or user_info.get('login')
            avatar = user_info.get('avatar_url')

            # GitHub 需要单独请求邮箱
            emails_resp = await client.get(
                cfg['emails_url'],
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/vnd.github+json',
                },
            )
            emails = emails_resp.json()
            if emails and isinstance(emails, list):
                primary = next((e for e in emails if e.get('primary')), emails[0])
                email = primary.get('email')

    if not email or not provider_id:
        raise HTTPException(status_code=400, detail='无法获取用户邮箱或唯一标识')

    # ------------------------------------------------------------------
    # Step C: 查找或创建用户
    # ------------------------------------------------------------------
    user = db.query(User).filter(
        User.provider == provider,
        User.provider_id == provider_id,
    ).first()

    if not user:
        # 检查是否已有相同邮箱的本地账号
        user = db.query(User).filter(User.email == email).first()
        if user:
            # 绑定 OAuth 到现有账号
            user.provider = provider
            user.provider_id = provider_id
            if avatar and not user.avatar_url:
                user.avatar_url = avatar
            if name and not user.full_name:
                user.full_name = name
        else:
            # 创建新用户
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                full_name=name,
                avatar_url=avatar,
                provider=provider,
                provider_id=provider_id,
            )
            db.add(user)

        db.commit()
        db.refresh(user)

    # ------------------------------------------------------------------
    # Step D: 签发 JWT 并回前端
    # ------------------------------------------------------------------
    jwt_token = create_access_token(data={'sub': user.id})
    redirect_url = f'{settings.FRONTEND_URL}/#/oauth/callback?token={jwt_token}'
    return RedirectResponse(url=redirect_url)
