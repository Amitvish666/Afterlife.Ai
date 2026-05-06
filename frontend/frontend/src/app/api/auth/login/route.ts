import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserByEmail, verifyPassword } from '../db';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7; // 7 days
const REFRESH_TOKEN_EXPIRE_DAYS = 30;

function createAccessToken(data: { sub: string; email: string }): string {
  const expire = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

function createRefreshToken(data: { sub: string }): string {
  const expire = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60;
  return jwt.sign({ ...data, exp: expire }, SECRET_KEY, { algorithm: ALGORITHM });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    const accessToken = createAccessToken({ sub: user.id, email: user.email });
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
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Login failed' } },
      { status: 500 }
    );
  }
}
