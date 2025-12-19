import { NextRequest, NextResponse } from 'next/server';
import { validateEnvironment, handleAPIError } from '@/utils/error-handling';
import { AuthValidationRequest, AuthValidationResponse } from '@/app/types/auth';

export const dynamic = "force-dynamic";

// In-memory token store for valid session tokens
const validTokens = new Set<string>();

/**
 * POST /api/auth/validate
 * Validates password and returns a session token
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate required environment variables
    const envError = validateEnvironment(
      ['MINE_PAGE_PASSWORD'],
      '/api/auth/validate'
    );
    if (envError) return envError;

    // 2. Parse request body
    const body: AuthValidationRequest = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Password is required'
        } as AuthValidationResponse,
        { status: 400 }
      );
    }

    // 3. Validate password
    if (password === process.env.MINE_PAGE_PASSWORD) {
      // Generate session token
      const token = crypto.randomUUID();
      validTokens.add(token);

      console.log('[/api/auth/validate] Authentication successful');

      return NextResponse.json({
        ok: true,
        token
      } as AuthValidationResponse);
    }

    // Invalid password
    console.log('[/api/auth/validate] Authentication failed: Invalid password');

    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid password'
      } as AuthValidationResponse,
      { status: 401 }
    );

  } catch (error) {
    return handleAPIError(
      error,
      '/api/auth/validate',
      'Authentication failed'
    );
  }
}

/**
 * GET /api/auth/validate
 * Optional: Verify if a token is valid
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  return NextResponse.json({
    ok: validTokens.has(token || '')
  } as AuthValidationResponse);
}
