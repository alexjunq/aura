import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse, errors } from '@/shared/api-errors';
import * as pieces from '@/modules/pieces/service';
import { buildPieceObjectKey, presignPut, presignGet } from '@aura/files';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

const presignBody = z
  .object({
    filename: z.string().regex(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|heic)$/i),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  })
  .strict();

/**
 * POST /api/v1/pieces/:id/photo
 *
 * Two operation modes via the `op` query param:
 *  - presign: returns a pre-signed PUT URL for the browser to upload directly to MinIO.
 *  - confirm: marks the uploaded key as the piece's primary photo.
 *
 * Future (Phase 9): the confirm step generates `thumb`/`medium` variants
 * with sharp. For v1 we store the original key only.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id: pieceId } = await params;
    await pieces.get(tenantId, pieceId); // tenant guard
    const op = new URL(req.url).searchParams.get('op') ?? 'presign';

    if (op === 'presign') {
      const input = presignBody.parse(await req.json());
      const key = buildPieceObjectKey({
        tenantId,
        pieceId,
        filename: `${Date.now()}-${input.filename}`,
        variant: 'original',
      });
      const putUrl = await presignPut(key, input.contentType);
      return NextResponse.json({ key, putUrl });
    }

    if (op === 'confirm') {
      const body = z.object({ key: z.string().min(1) }).parse(await req.json());
      await pieces.setPrimaryPhotoKey(tenantId, pieceId, body.key);
      const getUrl = await presignGet(body.key);
      return NextResponse.json({ key: body.key, url: getUrl });
    }

    throw errors.validation(`unknown op: ${op}`);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    await pieces.setPrimaryPhotoKey(tenantId, id, null);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
