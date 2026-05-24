import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`;
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  return NextResponse.redirect(githubUrl);
}
