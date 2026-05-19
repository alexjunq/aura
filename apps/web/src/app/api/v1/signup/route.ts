import { NextResponse } from 'next/server';
import { signupSchema } from '@/modules/auth/schema';
import * as authService from '@/modules/auth/service';
import { EmailAlreadyTakenError } from '@/modules/auth/service';
import { errors, toApiErrorResponse } from '@/shared/api-errors';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.parse(body);
    const result = await authService.signup(parsed);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof EmailAlreadyTakenError) {
      return toApiErrorResponse(errors.conflict(err.message));
    }
    return toApiErrorResponse(err);
  }
}
