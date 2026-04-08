import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7;
const REFRESH_TOKEN_EXPIRE_DAYS = 30;

// In-memory storage for users (in production, use a database)
const usersDb: Record<string, { id: string; email: string; name: string; passwordHash: string; createdAt: string }> = {};

function createAccessToken(data: { sub: string; email: string }): string {
  const expire = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

function createRefreshToken(data: { sub: string }): string {
  const expire = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback/google';

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your-github-client-id';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback/github';

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

    if (provider === 'google') {
      // Exchange code for tokens with Google
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
      }

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      userData = await userResponse.json();
    } else if (provider === 'github') {
      // Exchange code for tokens with GitHub
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
          redirect_uri: GITHUB_REDIRECT_URI,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
      }

      // Get user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: { 
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const userInfo = await userResponse.json();
      
      // Get user email from GitHub
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

    // Check if user exists or create new one
    let user = usersDb[userData.email];
    
    if (!user) {
      // Create new user
      user = {
        id: `oauth-${provider}-${Date.now()}`,
        email: userData.email,
        name: userData.name || `${provider} User`,
        passwordHash: hashPassword(`oauth-${provider}-${Date.now()}`),
        createdAt: new Date().toISOString(),
      };
      usersDb[userData.email] = user;
    }

    // Create tokens
    const accessToken = createAccessToken({ sub: user.id, email: user.email });
    const refreshToken = createRefreshToken({ sub: user.id });

    // Redirect to frontend with tokens
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('oauth_success', 'true');
    
    const response = NextResponse.redirect(redirectUrl);
    
    // Set cookies
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });
    
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    });

    // Also set localStorage for client-side access
    response.cookies.set('oauth_user_id', user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });
    
    response.cookies.set('oauth_user_name', user.name, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });
    
    response.cookies.set('oauth_user_email', user.email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}
