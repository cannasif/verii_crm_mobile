import { storage } from "../../../lib/storage";

function buildPreferenceKey(
  ruleType: number,
  userId: number,
  branchCode: string,
  salesRepId: number
): string {
  return `v3rii:lastDocumentSerialType:${ruleType}:${userId}:${branchCode}:${salesRepId}`;
}

export async function getLastDocumentSerialTypeId(
  ruleType: number,
  userId: number,
  branchCode: string,
  salesRepId: number
): Promise<number | null> {
  try {
    const raw = await storage.get<string>(
      buildPreferenceKey(ruleType, userId, branchCode, salesRepId)
    );
    if (raw == null || raw === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLastDocumentSerialTypeId(
  ruleType: number,
  userId: number,
  branchCode: string,
  salesRepId: number,
  documentSerialTypeId: number
): Promise<void> {
  try {
    await storage.set(
      buildPreferenceKey(ruleType, userId, branchCode, salesRepId),
      String(documentSerialTypeId)
    );
  } catch {
    return;
  }
}
