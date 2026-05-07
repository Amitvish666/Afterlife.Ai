import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserByEmail, createUser, hashPassword } from '../../../db';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7;
const REFRESH_TOKEN_EXPIRE_DAYS = 30;

function createAccessToken(data: { sub: string; email: string }): string {
  const expire = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

function createRefreshToken(data: { sub: string }): string {
  const expire = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider;
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    let userData: { email: string; name: string } | null = null;

    const host = request.headers.get('host') || request.nextUrl.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const dynamicGoogleRedirectUri = `${protocol}://${host}/api/auth/oauth/callback/google`;
    const dynamicGithubRedirectUri = `${protocol}://${host}/api/auth/oauth/callback/github`;

    if (provider === 'google') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: dynamicGoogleRedirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        console.error('[OAuth] Google token exchange failed:', tokens);
        return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
      }

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      userData = await userResponse.json();
    } else if (provider === 'github') {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          redirect_uri: dynamicGithubRedirectUri,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
      }

      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const userInfo = await userResponse.json();

      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const emails = await emailResponse.json();
      const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;

      userData = {
        email: primaryEmail || userInfo.email || 'no-email@github.com',
        name: userInfo.name || userInfo.login,
      };
    } else {
      return NextResponse.redirect(new URL('/login?error=invalid_provider', request.url));
    }

    if (!userData || !userData.email) {
      return NextResponse.redirect(new URL('/login?error=no_user_data', request.url));
    }

    // Check if user exists in Supabase or create new
    let user = await getUserByEmail(userData.email);

    if (!user) {
      user = await createUser({
        id: `oauth-${provider}-${Date.now()}`,
        email: userData.email,
        name: userData.name || `${provider} User`,
        passwordHash: hashPassword(`oauth-${provider}-${Date.now()}`),
        createdAt: new Date().toISOString(),
      });
    }

    const accessToken = createAccessToken({ sub: user.id, email: user.email });
    const refreshToken = createRefreshToken({ sub: user.id });

    // Use a self-submitting HTML page to store tokens in localStorage then redirect.
    // We encode the values to safely embed them in the script.
    const encodedAccessToken = JSON.stringify(accessToken);
    const encodedRefreshToken = JSON.stringify(refreshToken);
    const encodedUserId = JSON.stringify(user.id);
    const encodedUserName = JSON.stringify(user.name);
    const encodedUserEmail = JSON.stringify(user.email);

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Signing you in...</title>
    <style>
      body { background-color: #020617; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; margin: 0; }
      .container { text-align: center; }
      .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #a855f7; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="spinner"></div>
      <div>Signing you in...</div>
    </div>
    <script>
      try {
        var accessToken = ${encodedAccessToken};
        var refreshToken = ${encodedRefreshToken};
        var userId = ${encodedUserId};
        var userName = ${encodedUserName};
        var userEmail = ${encodedUserEmail};

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('oauth_user_id', userId);
        localStorage.setItem('oauth_user_name', userName);
        localStorage.setItem('oauth_user_email', userEmail);

        // Pre-hydrate Zustand useAuthStore ('auth-storage') directly to prevent race conditions during page transition
        var authState = {
          state: {
            user: {
              id: userId,
              name: userName || userEmail.split('@')[0] || 'User',
              email: userEmail,
              created_at: new Date().toISOString(),
              consent_given: false,
              retention_period: 365
            },
            isAuthenticated: true
          },
          version: 0
        };
        localStorage.setItem('auth-storage', JSON.stringify(authState));
      } catch(e) {
        console.error('Failed to store tokens', e);
      }
      window.location.replace('/dashboard');
    </script>
  </body>
</html>`;

    const response = new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}
