import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.OAUTH_CLIENT_ID;
  
  // 💡 优化：直接动态提取您当前正在访问的域名（如 https://list.472010.xyz）
  // 这能 100% 避开由于环境变量拼写错误或多加斜杠导致的 GitHub 回调失败
  const origin = request.nextUrl.origin; 
  const redirectUri = `${origin}/api/auth/callback`;
  
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  return NextResponse.redirect(githubUrl);
}
