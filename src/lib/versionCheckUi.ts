import type { ApkUpdatePhase } from "./versionCheck";

export type UpdateFlowPhase = "idle" | ApkUpdatePhase;

export function getUpdateModalTitle(
  phase: UpdateFlowPhase,
  forceUpdate: boolean,
  translate: (key: string) => string,
): string {
  if (phase === "downloading") {
    return translate("updates.downloadingTitle");
  }

  if (phase === "installing") {
    return translate("updates.installingTitle");
  }

  if (forceUpdate) {
    return translate("updates.forceTitle");
  }

  return translate("updates.availableTitle");
}

export function getUpdateModalDescription(
  phase: UpdateFlowPhase,
  downloadProgress: number,
  latestVersion: string | undefined,
  releaseNotes: string | undefined,
  translate: (key: string, options?: Record<string, string | number>) => string,
): string {
  if (phase === "downloading") {
    return translate("updates.downloadingDescription", {
      percent: Math.round(downloadProgress * 100),
    });
  }

  if (phase === "installing") {
    return translate("updates.installingDescription");
  }

  if (!latestVersion) {
    return "";
  }

  return translate("updates.description", {
    version: latestVersion,
    notes: releaseNotes || translate("updates.noNotes"),
  });
}
