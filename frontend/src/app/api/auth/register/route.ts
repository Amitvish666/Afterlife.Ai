import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { usersDb, hashPassword } from '../db';

const SECRET_KEY = 'your-secret-key-change-in-production';
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
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (usersDb[email]) {
      return NextResponse.json(
        { success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } },
        { status: 400 }
      );
    }

    // Create new user
    const userId = uuidv4();
    usersDb[email] = {
      id: userId,
      email,
      name: name || email.split('@')[0],
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    const accessToken = createAccessToken({ sub: userId, email });
    const refreshToken = createRefreshToken({ sub: userId });

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: userId,
            email,
            name: usersDb[email].name,
            created_at: usersDb[email].createdAt,
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'bearer',
            expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Registration failed' } },
      { status: 500 }
    );
  }
}
