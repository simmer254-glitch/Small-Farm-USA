// Thin wrapper over the Microsoft Graph endpoints this app needs — folder
// bootstrap and file upload under /Small Farm USA in the owner's OneDrive.
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function graphFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Graph API ${path} failed: ${res.status} ${body}`);
  }
  return res;
}

const ROOT_FOLDER = 'Small Farm USA';
const SUBFOLDERS = ['Brand inspections', 'Receipts', 'Vet records', 'Insurance & titles'];

// Idempotent: PATCH-style "create if missing" via conflictBehavior: replace
// would overwrite; using `fail` + ignoring the 409 is the correct idempotent
// pattern for "ensure this folder exists" without clobbering its contents.
async function ensureFolder(accessToken: string, parentPath: string, name: string): Promise<void> {
  // Graph's colon path-addressing syntax (root:{path}:/children) only works
  // for a non-empty path — an empty parentPath (the root folder itself)
  // produces the literal, invalid "root::/children" and 400s.
  const childrenUrl = parentPath ? `/me/drive/root:${parentPath}:/children` : '/me/drive/root/children';
  try {
    await graphFetch(accessToken, childrenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
    });
  } catch (e) {
    // A 409 (already exists) is expected and fine; anything else, rethrow.
    if (!(e instanceof Error) || !e.message.includes('409')) throw e;
  }
}

export async function bootstrapFolders(accessToken: string): Promise<void> {
  await ensureFolder(accessToken, '', ROOT_FOLDER);
  for (const sub of SUBFOLDERS) {
    await ensureFolder(accessToken, `/${ROOT_FOLDER}`, sub);
  }
}

// 4 MB is a hard Graph API limit for simple PUT /content, not a soft
// recommendation — ordinary phone photos (2-8MB HEIC/JPEG) and scanned PDFs
// (5-20+MB) cross it routinely, not as an edge case.
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;

export async function uploadFile(
  accessToken: string,
  folder: string,
  filename: string,
  bytes: ArrayBuffer
): Promise<{ itemId: string }> {
  const path = `/${ROOT_FOLDER}/${folder}/${encodeURIComponent(filename)}`;

  if (bytes.byteLength < SIMPLE_UPLOAD_LIMIT) {
    const res = await graphFetch(accessToken, `/me/drive/root:${path}:/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    const json = await res.json();
    return { itemId: json.id };
  }

  // >=4MB: create an upload session, then a single ranged PUT covering the
  // whole file. This is not the multi-chunk looping "resumable upload"
  // implies — that's only needed above ~60MiB, which no farm document will
  // hit, so a second PUT loop is deliberately not implemented here.
  const sessionRes = await graphFetch(accessToken, `/me/drive/root:${path}:/createUploadSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
  });
  const { uploadUrl } = await sessionRes.json();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(bytes.byteLength),
      'Content-Range': `bytes 0-${bytes.byteLength - 1}/${bytes.byteLength}`,
    },
    body: bytes,
  });
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '');
    throw new Error(`Graph upload session PUT failed: ${putRes.status} ${body}`);
  }
  const json = await putRes.json();
  return { itemId: json.id };
}
