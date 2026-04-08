import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or header
    const token = request.cookies.get('access_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: 'No token provided' } },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, SECRET_KEY) as { sub: string; email: string };
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: decoded.sub,
          email: decoded.email,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid token' } },
      { status: 401 }
    );
  }
}
