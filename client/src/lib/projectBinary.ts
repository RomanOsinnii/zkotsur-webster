import JSZip from 'jszip';

const websterProjectFilename = 'project.json';
const websterManifestFilename = 'manifest.json';
const websterContainerVersion = 1;
const websterBinaryMagic = 'WEBSTERBIN1';

type WebsterManifest = {
  format: 'webster';
  version: number;
  createdAt: string;
  projectFile: string;
  projectBytes: number;
  projectSha256: string;
};

type FrameWithJson = {
  id: string;
  json?: Record<string, unknown>;
};

type PortableProject<TFrame> = {
  frames: TFrame[];
};

export async function createPortableProject<TFrame extends FrameWithJson>(frames: TFrame[], zip: JSZip): Promise<PortableProject<TFrame>> {
  const project: PortableProject<TFrame> = { frames: structuredClone(frames) as TFrame[] };
  for (const frame of project.frames) {
    if (!frame.json) continue;
    const objects = Array.isArray(frame.json.objects) ? frame.json.objects : [];
    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index] as Record<string, unknown>;
      if (object.type !== 'image' || typeof object.src !== 'string' || !object.src.startsWith('data:')) continue;
      const asset = dataUrlToAsset(object.src, `${frame.id}-${index}`);
      zip.file(`assets/${asset.filename}`, asset.data, { base64: true });
      object.src = `assets/${asset.filename}`;
    }
  }
  return project;
}

export async function hydratePortableProject<TProject extends { frames: Array<{ json?: Record<string, unknown> }> }>(project: TProject, zip: JSZip): Promise<TProject> {
  for (const frame of project.frames) {
    if (!frame.json) continue;
    const objects = Array.isArray(frame.json.objects) ? frame.json.objects : [];
    for (const object of objects) {
      const item = object as Record<string, unknown>;
      if (item.type !== 'image' || typeof item.src !== 'string' || !item.src.startsWith('assets/')) continue;
      const file = zip.file(item.src);
      if (!file) continue;
      item.src = `data:${mimeFromFilename(item.src)};base64,${await file.async('base64')}`;
    }
  }
  return project;
}

export async function createWebsterBinaryFile<TFrame extends FrameWithJson>(frames: TFrame[]): Promise<Blob> {
  const zip = new JSZip();
  const project = await createPortableProject(frames, zip);
  const projectJson = JSON.stringify(project, null, 2);
  const projectBytes = new TextEncoder().encode(projectJson);
  const manifest: WebsterManifest = {
    format: 'webster',
    version: websterContainerVersion,
    createdAt: new Date().toISOString(),
    projectFile: websterProjectFilename,
    projectBytes: projectBytes.byteLength,
    projectSha256: await sha256Hex(projectBytes)
  };
  zip.file(websterProjectFilename, projectJson);
  zip.file(websterManifestFilename, JSON.stringify(manifest, null, 2));

  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  const checksum = await sha256Hex(zipBytes);
  const checksumBytes = new TextEncoder().encode(checksum);
  const magicBytes = new TextEncoder().encode(websterBinaryMagic);
  const headerSize = magicBytes.length + 1 + 4 + checksumBytes.length;
  const out = new Uint8Array(headerSize + zipBytes.byteLength);
  out.set(magicBytes, 0);
  out[magicBytes.length] = websterContainerVersion;
  new DataView(out.buffer).setUint32(magicBytes.length + 1, zipBytes.byteLength, true);
  out.set(checksumBytes, magicBytes.length + 1 + 4);
  out.set(zipBytes, headerSize);
  return new Blob([out], { type: 'application/octet-stream' });
}

export async function parseWebsterBinaryFile(rawData: ArrayBuffer): Promise<unknown> {
  const bytes = new Uint8Array(rawData);
  const magicBytes = new TextEncoder().encode(websterBinaryMagic);
  const headerSize = magicBytes.length + 1 + 4 + 64;
  if (bytes.byteLength < headerSize + 1) {
    throw new Error('Broken file: Webster container is too short.');
  }
  if (!equalsBytes(bytes.slice(0, magicBytes.length), magicBytes)) {
    throw new Error('Unsupported file: Webster binary signature is missing.');
  }
  const version = bytes[magicBytes.length];
  if (version !== websterContainerVersion) {
    throw new Error(`Unsupported Webster binary version: ${String(version)}.`);
  }
  const payloadLength = new DataView(bytes.buffer, bytes.byteOffset + magicBytes.length + 1, 4).getUint32(0, true);
  const expectedChecksum = new TextDecoder().decode(bytes.slice(magicBytes.length + 1 + 4, headerSize)).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedChecksum)) {
    throw new Error('Broken file: checksum header is invalid.');
  }
  const payload = bytes.slice(headerSize);
  if (payload.byteLength !== payloadLength) {
    throw new Error('Broken file: payload size mismatch.');
  }
  const actualChecksum = await sha256Hex(payload);
  if (actualChecksum !== expectedChecksum) {
    throw new Error('Broken file: payload checksum mismatch.');
  }

  const zip = await JSZip.loadAsync(payload);
  const manifestFile = zip.file(websterManifestFilename);
  if (!manifestFile) throw new Error('Broken file: manifest.json is missing.');
  const manifest = JSON.parse(await manifestFile.async('string')) as Partial<WebsterManifest>;
  if (manifest.format !== 'webster') throw new Error('Unsupported format: expected webster.');
  if (manifest.projectFile !== websterProjectFilename) throw new Error('Broken file: manifest project file is invalid.');

  const projectFile = zip.file(websterProjectFilename);
  if (!projectFile) throw new Error('Broken file: project.json is missing.');
  const projectBytes = await projectFile.async('uint8array');
  if (typeof manifest.projectBytes !== 'number' || projectBytes.byteLength !== manifest.projectBytes) {
    throw new Error('Broken file: project size mismatch.');
  }
  const projectChecksum = await sha256Hex(projectBytes);
  if (typeof manifest.projectSha256 !== 'string' || projectChecksum !== manifest.projectSha256.toLowerCase()) {
    throw new Error('Broken file: project checksum mismatch.');
  }
  return hydratePortableProject(JSON.parse(new TextDecoder().decode(projectBytes)), zip);
}

function dataUrlToAsset(dataUrl: string, id: string) {
  const [meta, data] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
  const extension = mimeToExtension(mime);
  return { data, filename: `image-${id}.${extension}` };
}

function mimeFromFilename(filename: string) {
  if (filename.endsWith('.svg') || filename.endsWith('.svg+xml')) return 'image/svg+xml';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.gif')) return 'image/gif';
  if (filename.endsWith('.bmp')) return 'image/bmp';
  if (filename.endsWith('.tif') || filename.endsWith('.tiff')) return 'image/tiff';
  return 'image/png';
}

function mimeToExtension(mime: string) {
  const normalized = mime.toLowerCase();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/svg+xml') return 'svg';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  if (normalized === 'image/bmp') return 'bmp';
  if (normalized === 'image/tiff') return 'tiff';
  if (normalized === 'image/png') return 'png';
  const fallback = normalized.split('/')[1] ?? 'png';
  return fallback.replace('+xml', '').replace('jpeg', 'jpg');
}

async function sha256Hex(data: Uint8Array) {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, '0')).join('');
}

function equalsBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}
