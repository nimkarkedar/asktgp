/**
 * Read-only: list every file in the Drive folder (recursively) and compare
 * against what's already in transcript_chunks. Nothing is written.
 *
 *   npx tsx scripts/list-drive.ts
 */
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type DriveFile = { id: string; name: string; mimeType: string; path: string };

async function listRecursive(folderId: string, prefix = ""): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name) continue;
      if (f.mimeType === "application/vnd.google-apps.folder") {
        out.push(...(await listRecursive(f.id, `${prefix}${f.name}/`)));
      } else {
        out.push({ id: f.id, name: f.name, mimeType: f.mimeType ?? "", path: `${prefix}${f.name}` });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

async function ingestedFileNames(): Promise<Set<string>> {
  const names = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transcript_chunks")
      .select("file_name")
      .eq("chunk_index", 0)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) names.add(r.file_name);
    if (!data || data.length < PAGE) break;
  }
  return names;
}

async function main() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const [files, ingested] = await Promise.all([listRecursive(folderId), ingestedFileNames()]);

  if (process.argv.includes("--names")) {
    for (const f of files) console.log(f.path);
    return;
  }

  const byExt = new Map<string, number>();
  for (const f of files) {
    const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : `(${f.mimeType})`;
    byExt.set(ext, (byExt.get(ext) ?? 0) + 1);
  }

  const driveNames = new Set(files.map((f) => f.name));
  const notIngested = files.filter((f) => !ingested.has(f.name));
  const notInDrive = [...ingested].filter((n) => !driveNames.has(n));

  console.log(`Drive files: ${files.length}`);
  console.log(`By type: ${[...byExt].map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`Already indexed: ${files.length - notIngested.length}`);
  console.log(`\nIn Drive, not yet indexed (${notIngested.length}):`);
  for (const f of notIngested) console.log(`  ${f.path}`);
  console.log(`\nIndexed, but not in this Drive folder (${notInDrive.length}):`);
  for (const n of notInDrive) console.log(`  ${n}`);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
