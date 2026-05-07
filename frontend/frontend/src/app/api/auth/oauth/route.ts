import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserByEmail, createUser, hashPassword } from '../db';

const SECRET_KEY = 'your-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7; // 7 days
const REFRESH_TOKEN_EXPIRE_DAYS = 30;

// OAuth configuration - in production, these would come from environment variables
const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback/google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || 'your-github-client-id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback/github',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || 'your-apple-client-id',
    clientSecret: process.env.APPLE_CLIENT_SECRET || 'your-apple-client-secret',
    redirectUri: process.env.APPLE_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback/apple',
    authorizationUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
  },
};

function createAccessToken(data: { sub: string; email: string }): string {
  const expire = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

function createRefreshToken(data: { sub: string }): string {
  const expire = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

// Generate OAuth authorization URL
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider');

  if (!provider || !['google', 'github', 'apple'].includes(provider)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PROVIDER', message: 'Invalid OAuth provider' } },
      { status: 400 }
    );
  }

  const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
  const scope = provider === 'google' 
    ? 'openid email profile'
    : provider === 'github'
    ? 'user:email'
    : 'name email';

  const state = Math.random().toString(36).substring(7);
  
  // In production, store state in session for verification
  // For demo, we'll use a simple approach

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  // For demo purposes, return the auth URL
  return NextResponse.json({
    success: true,
    data: {
      authUrl: authUrl.toString(),
      message: 'In production, this would redirect to the OAuth provider',
    },
  });
}

// Handle OAuth callback (mock implementation for demo)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, code } = body;

    if (!provider || !['google', 'github', 'apple'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PROVIDER', message: 'Invalid OAuth provider' } },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_CODE', message: 'Authorization code is required' } },
        { status: 400 }
      );
    }

    // In production, exchange code for tokens with the OAuth provider
    // For demo, we'll create a mock user based on the provider
    
    const timestamp = Date.now();
    const mockUserId = `oauth-${provider}-${timestamp}`;
    const mockEmail = `user@${provider}.com`;
    const mockName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;

    // Check if user already exists
    let user = await getUserByEmail(mockEmail);

    if (!user) {
      // Create new user
      user = await createUser({
        id: mockUserId,
        email: mockEmail,
        name: mockName,
        passwordHash: hashPassword(`oauth-${provider}-${timestamp}`),
        createdAt: new Date().toISOString(),
      });
    }

    const accessToken = createAccessToken({ sub: user.id, email: mockEmail });
    const refreshToken = createRefreshToken({ sub: user.id });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.createdAt,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
          expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
      },
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'OAuth authentication failed' } },
      { status: 500 }
    );
  }
}
