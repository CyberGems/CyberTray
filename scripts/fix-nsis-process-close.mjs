import { randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export default function fixNsisProcessClose({ targetPresentableName }) {
  if (targetPresentableName !== "nsis") return;

  const requireFromBuilder = createRequire(require.resolve("electron-builder/package.json"));
  const builderLib = dirname(requireFromBuilder.resolve("app-builder-lib/package.json"));
  const template = join(builderLib, "templates", "nsis", "include", "allowOnlyOneInstallerInstance.nsh");
  const source = readFileSync(template, "utf8");

  // The all-users fallback in electron-builder 26.8.1 drops the retry flag ($0 = /F).
  const original = 'nsExec::Exec `taskkill /IM "${_FILE}" /FI "PID ne $pid"`';
  const corrected = 'nsExec::Exec `"$SYSDIR\\taskkill.exe" $0 /IM "${_FILE}" /FI "PID ne $pid"`';
  const parts = source.split(original);
  if (parts.length === 1 && source.includes(corrected)) return;
  if (parts.length !== 2) {
    throw new Error("The electron-builder NSIS process-close template changed. Review the all-users retry patch.");
  }

  const temporary = `${template}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, parts.join(corrected), { flag: "wx" });
    renameSync(temporary, template);
  } finally {
    rmSync(temporary, { force: true });
  }
}
