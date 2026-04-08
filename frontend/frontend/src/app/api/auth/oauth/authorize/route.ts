import { NextRequest, NextResponse } from 'next/server';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback/google';

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your-github-client-id';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback/github';

// Generate OAuth authorization URL and redirect
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');
  
  if (provider === 'google') {
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    
    // Redirect to Google
    return NextResponse.redirect(googleAuthUrl.toString());
  }
  
  if (provider === 'github') {
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI);
    githubAuthUrl.searchParams.set('scope', 'user:email');
    githubAuthUrl.searchParams.set('state', Math.random().toString(36).substring(7));
    
    // Redirect to GitHub
    return NextResponse.redirect(githubAuthUrl.toString());
  }
  
  return NextResponse.json(
    { success: false, error: { message: 'Invalid provider. Use google or github.' } },
    { status: 400 }
  );
}
