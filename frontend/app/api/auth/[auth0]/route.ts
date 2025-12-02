import { NextRequest, NextResponse } from 'next/server';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '');
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_BASE_URL = process.env.AUTH0_BASE_URL || process.env.APP_BASE_URL;
const AUTH0_SECRET = process.env.AUTH0_SECRET;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auth0: string }> }
) {
  const { auth0: route } = await params;
  const { searchParams } = new URL(request.url);

  try {
    switch (route) {
      case 'login': {
        // Redirect to Auth0 login
        const returnTo = searchParams.get('returnTo') || '/dashboard';
        const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64');
        
        const authUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', AUTH0_CLIENT_ID!);
        authUrl.searchParams.set('redirect_uri', `${AUTH0_BASE_URL}/api/auth/callback`);
        authUrl.searchParams.set('scope', 'openid profile email');
        authUrl.searchParams.set('state', state);
        
        return NextResponse.redirect(authUrl.toString());
      }

      case 'logout': {
        // Build Auth0 logout URL
        const logoutUrl = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
        logoutUrl.searchParams.set('client_id', AUTH0_CLIENT_ID!);
        logoutUrl.searchParams.set('returnTo', AUTH0_BASE_URL!);
        
        // Clear session cookie and redirect to Auth0 logout
        const response = NextResponse.redirect(logoutUrl.toString());
        response.cookies.set('appSession', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/',
        });
        
        return response;
      }

      case 'callback': {
        // Handle Auth0 callback
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (!code) {
          return NextResponse.redirect(`${AUTH0_BASE_URL}?error=no_code`);
        }

        try {
          // Exchange code for tokens
          const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              client_id: AUTH0_CLIENT_ID,
              client_secret: AUTH0_CLIENT_SECRET,
              code,
              redirect_uri: `${AUTH0_BASE_URL}/api/auth/callback`,
            }),
          });

          if (!tokenResponse.ok) {
            throw new Error('Token exchange failed');
          }

          const tokens = await tokenResponse.json();

          // Get user info
          const userResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });

          const user = await userResponse.json();

          // Create session
          const session = {
            user: {
              sub: user.sub,
              email: user.email,
              name: user.name,
              picture: user.picture,
            },
            accessToken: tokens.access_token,
            idToken: tokens.id_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
          };

          // Determine redirect URL
          let returnTo = '/dashboard';
          if (state) {
            try {
              const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
              returnTo = stateData.returnTo || '/dashboard';
            } catch (e) {
              console.error('Error parsing state:', e);
            }
          }

          // Set session cookie and redirect
          const response = NextResponse.redirect(`${AUTH0_BASE_URL}${returnTo}`);
          response.cookies.set('appSession', JSON.stringify(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokens.expires_in,
            path: '/',
          });

          return response;
        } catch (error) {
          console.error('Callback error:', error);
          return NextResponse.redirect(`${AUTH0_BASE_URL}?error=auth_failed`);
        }
      }

      case 'me': {
        // Get current user from session
        const sessionCookie = request.cookies.get('appSession');
        
        if (!sessionCookie) {
          return NextResponse.json({ user: null }, { status: 401 });
        }

        try {
          const session = JSON.parse(sessionCookie.value);
          
          // Check if session is expired
          if (session.expiresAt < Date.now()) {
            return NextResponse.json({ user: null }, { status: 401 });
          }

          return NextResponse.json({ user: session.user });
        } catch (error) {
          return NextResponse.json({ user: null }, { status: 401 });
        }
      }

      default:
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Auth route error:', error);
    return NextResponse.json(
      { error: 'Authentication error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
