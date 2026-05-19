import { addMoney, mulMoney, secondsToHours, toBase } from '@aura/domain';
import * as pieces from '@/modules/pieces/service';
import * as materials from '@/modules/materials/service';
import * as settings from '@/modules/settings/service';
import * as sales from '@/modules/sales/service';

export interface MaterialLine {
  materialId: string;
  materialName: string;
  unit: string;
  quantity: string;
  unitPriceBase: string;
  totalBase: string;
}

export interface AtCurrentPrices {
  materialsTotalBase: string;
  totalCostBase: string;
}

export interface CostBreakdown {
  pieceId: string;
  materials: {
    lines: MaterialLine[];
    totalBase: string;
  };
  labor: {
    totalSeconds: number;
    hours: string;
    hourlyRateBase: string;
    totalBase: string;
  };
  totalCostBase: string;
  /** Most recent non-refunded sale price in base currency, if any. */
  lastSalePriceBase: string | null;
  /** What the material cost *would* be if we used current prices instead of
   *  the snapshotted ones — useful for "drift since I added these materials". */
  atCurrentPrices: AtCurrentPrices;
}

/**
 * Cost breakdown for a piece (spec §6.8 / §7 Flow D).
 *
 * Pure read. Returns:
 *   - per-material snapshotted lines and their total (in base currency)
 *   - labor cost = (sum durations / 3600) * tenant.hourlyLaborRate
 *   - lastSalePriceBase if the piece has a non-refunded sale
 *   - what the materials cost would be at current prices for drift comparison
 */
export async function breakdown(
  tenantId: string,
  pieceId: string,
): Promise<CostBreakdown> {
  // Tenant-scope guard via service.
  await pieces.get(tenantId, pieceId);

  const [pieceMaterials, totalSec, tenantSettings, currentPriceMap, saleHistory] = await Promise.all([
    pieces.listMaterials(tenantId, pieceId),
    pieces.totalSessionSeconds(tenantId, pieceId),
    settings.getSettings(tenantId),
    fetchCurrentPriceMap(tenantId, /* materialIds */ undefined),
    sales.list(tenantId, { pieceId, limit: 50 }),
  ]);

  const lines: MaterialLine[] = [];
  let materialsTotalBase = '0';
  let atCurrentMaterialsTotalBase = '0';

  for (const pm of pieceMaterials) {
    const lineBase = mulMoney(pm.capturedPricePerUnit, pm.quantity);
    materialsTotalBase = addMoney(materialsTotalBase, lineBase);
    lines.push({
      materialId: pm.materialId,
      materialName: pm.materialName,
      unit: pm.materialUnit,
      quantity: pm.quantity,
      unitPriceBase: pm.capturedPricePerUnit,
      totalBase: lineBase,
    });

    const currentForMaterial = currentPriceMap.get(pm.materialId);
    if (currentForMaterial) {
      const currentInBase = toBase(currentForMaterial.pricePerUnit, currentForMaterial.fxRateToBase);
      atCurrentMaterialsTotalBase = addMoney(
        atCurrentMaterialsTotalBase,
        mulMoney(currentInBase, pm.quantity),
      );
    } else {
      // No current price — fall back to the snapshotted one so the "at current
      // prices" total never drops materials silently.
      atCurrentMaterialsTotalBase = addMoney(atCurrentMaterialsTotalBase, lineBase);
    }
  }

  const laborTotalBase = mulMoney(
    tenantSettings.hourlyLaborRate,
    secondsToHours(totalSec),
  );

  const totalCostBase = addMoney(materialsTotalBase, laborTotalBase);
  const atCurrentTotalCostBase = addMoney(atCurrentMaterialsTotalBase, laborTotalBase);

  const lastActiveSale = saleHistory.find((s) => !s.refundedAt);
  const lastSalePriceBase = lastActiveSale
    ? toBase(lastActiveSale.salePrice, lastActiveSale.fxRateToBase)
    : null;

  return {
    pieceId,
    materials: { lines, totalBase: materialsTotalBase },
    labor: {
      totalSeconds: totalSec,
      hours: secondsToHours(totalSec),
      hourlyRateBase: tenantSettings.hourlyLaborRate,
      totalBase: laborTotalBase,
    },
    totalCostBase,
    lastSalePriceBase,
    atCurrentPrices: {
      materialsTotalBase: atCurrentMaterialsTotalBase,
      totalCostBase: atCurrentTotalCostBase,
    },
  };
}

/**
 * Build a Map<materialId, latestCurrentPriceRow> from the current prices view.
 * Multiple sources can exist per material; the newest wins (so a manual
 * override beats a stale feed entry).
 */
async function fetchCurrentPriceMap(
  tenantId: string,
  materialIds: string[] | undefined,
): Promise<Map<string, { pricePerUnit: string; fxRateToBase: string; effectiveAt: Date }>> {
  const all = await materials.currentPrices(tenantId);
  const map = new Map<string, { pricePerUnit: string; fxRateToBase: string; effectiveAt: Date }>();
  for (const row of all) {
    if (materialIds && !materialIds.includes(row.materialId)) continue;
    const existing = map.get(row.materialId);
    if (!existing || row.effectiveAt > existing.effectiveAt) {
      map.set(row.materialId, {
        pricePerUnit: row.pricePerUnit,
        fxRateToBase: row.fxRateToBase,
        effectiveAt: row.effectiveAt,
      });
    }
  }
  return map;
}
