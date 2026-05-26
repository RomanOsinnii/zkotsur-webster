import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import JSZip = require('jszip');
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './project.entity';
import { UserEntity } from '../users/user.entity';
import { ProjectActor } from '../auth/auth.types';

export type ProjectExportFormat = 'json' | 'png' | 'pdf' | 'webster';

export type ProjectExportFile = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type ProjectShareState = {
  isPublic: boolean;
  shareSlug: string | null;
  sharePath: string | null;
};

export type ProjectShareDetails = ProjectShareState & {
  visitors: { username: string; visitedAt: string }[];
};

export type PublicProjectView = Pick<ProjectEntity, 'id' | 'name' | 'description' | 'updatedAt'> & {
  data: Record<string, unknown>;
  shareSlug: string;
  readOnly: true;
};

export type ProjectView = Pick<ProjectEntity, 'id' | 'name' | 'description' | 'isPublic' | 'shareSlug' | 'lastOpenedAt' | 'createdAt' | 'updatedAt'> & {
  data: Record<string, unknown>;
};

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>
  ) {}

  async findAll(actor: ProjectActor): Promise<ProjectView[]> {
    const query = this.projectsRepository
      .createQueryBuilder('project')
      .orderBy('COALESCE(project.lastOpenedAt, project.updatedAt)', 'DESC')
      .addOrderBy('project.updatedAt', 'DESC');
    this.applyActorFilter(query, actor);
    const projects = await query.getMany();

    return Promise.all(projects.map((project) => this.toProjectView(project)));
  }

  async findRecent(actor: ProjectActor, limit = 6): Promise<ProjectView[]> {
    const query = this.projectsRepository
      .createQueryBuilder('project')
      .orderBy('COALESCE(project.lastOpenedAt, project.updatedAt)', 'DESC')
      .addOrderBy('project.updatedAt', 'DESC')
      .limit(limit);
    this.applyActorFilter(query, actor);
    const projects = await query.getMany();

    return Promise.all(projects.map((project) => this.toProjectView(project)));
  }

  async findOne(id: string, actor: ProjectActor): Promise<ProjectView> {
    const project = await this.findOneEntity(id, actor);
    return this.toProjectView(project);
  }

  private async findOneEntity(id: string, actor: ProjectActor): Promise<ProjectEntity> {
    const query = this.projectsRepository.createQueryBuilder('project').where('project.id = :id', { id });
    this.applyActorFilter(query, actor);
    const project = await query.getOne();
    if (!project) {
      throw new NotFoundException(`Project with id '${id}' was not found`);
    }

    return project;
  }

  async openProject(id: string, actor: ProjectActor): Promise<ProjectView> {
    const project = await this.findOneEntity(id, actor);
    project.lastOpenedAt = new Date();
    const saved = await this.projectsRepository.save(project);
    return this.toProjectView(saved);
  }

  async create(dto: CreateProjectDto, actor: ProjectActor): Promise<ProjectView> {
    const project = this.projectsRepository.create({
      name: dto.name,
      description: dto.description?.trim() || null,
      lastOpenedAt: new Date(),
      owner: actor.kind === 'user' ? ({ id: actor.userId } as UserEntity) : null,
      guestId: actor.kind === 'guest' ? actor.guestId : null
    });

    const saved = await this.projectsRepository.save(project);
    saved.dataPath = this.getDataPath(saved.id);
    await this.writeProjectData(saved.id, saved.dataPath, dto.data);
    const updated = await this.projectsRepository.save(saved);
    return this.toProjectView(updated);
  }

  async createFromImportedData(
    actor: ProjectActor,
    payload: { name: string; description?: string | null; data: Record<string, unknown> }
  ): Promise<ProjectView> {
    return this.create(
      {
        name: payload.name,
        description: payload.description ?? undefined,
        data: payload.data
      },
      actor
    );
  }

  async update(id: string, dto: UpdateProjectDto, actor: ProjectActor): Promise<ProjectView> {
    const project = await this.findOneEntity(id, actor);

    if (dto.name !== undefined) {
      project.name = dto.name;
    }
    if (dto.description !== undefined) {
      project.description = dto.description?.trim() || null;
    }
    if (!project.dataPath) {
      project.dataPath = this.getDataPath(project.id);
    }
    if (dto.data !== undefined) {
      await this.writeProjectData(project.id, project.dataPath, dto.data);
    }

    const saved = await this.projectsRepository.save(project);
    return this.toProjectView(saved);
  }

  async remove(id: string, actor: ProjectActor): Promise<void> {
    const project = await this.findOneEntity(id, actor);
    await rm(this.getProjectDir(project.id), { recursive: true, force: true });
    if (project.dataPath) await rm(project.dataPath, { force: true });
    await this.projectsRepository.remove(project);
  }

  async enableShare(id: string, actor: ProjectActor): Promise<ProjectShareState> {
    const project = await this.findOneEntity(id, actor);

    project.isPublic = true;
    project.shareSlug = project.shareSlug ?? await this.generateUniqueShareSlug();

    const saved = await this.projectsRepository.save(project);

    return {
      isPublic: saved.isPublic,
      shareSlug: saved.shareSlug,
      sharePath: saved.shareSlug ? `/shared/${saved.shareSlug}` : null
    };
  }

  async disableShare(id: string, actor: ProjectActor): Promise<void> {
    const project = await this.findOneEntity(id, actor);
    project.isPublic = false;
    project.shareSlug = null;
    await this.projectsRepository.save(project);
  }

  async getShareDetails(id: string, actor: ProjectActor): Promise<ProjectShareDetails> {
    const project = await this.findOneEntity(id, actor);
    return {
      isPublic: project.isPublic,
      shareSlug: project.shareSlug,
      sharePath: project.shareSlug ? `/shared/${project.shareSlug}` : null,
      visitors: Array.isArray(project.shareVisitors) ? project.shareVisitors : []
    };
  }

  async findSharedProject(slug: string, viewerName?: string): Promise<PublicProjectView> {
    const project = await this.projectsRepository.findOne({
      where: { shareSlug: slug, isPublic: true }
    });

    if (!project) {
      throw new NotFoundException('Shared project link is missing or no longer available.');
    }

    const normalizedViewer = viewerName?.trim();
    if (normalizedViewer) {
      const visitors = Array.isArray(project.shareVisitors) ? project.shareVisitors : [];
      const withoutExisting = visitors.filter((entry) => entry.username !== normalizedViewer);
      project.shareVisitors = [{ username: normalizedViewer.slice(0, 60), visitedAt: new Date().toISOString() }, ...withoutExisting].slice(0, 100);
      await this.projectsRepository.save(project);
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      data: await this.readProjectData(project),
      shareSlug: project.shareSlug!,
      readOnly: true,
      updatedAt: project.updatedAt
    };
  }

  async cloneSharedProject(slug: string, actor: ProjectActor): Promise<ProjectView> {
    const source = await this.projectsRepository.findOne({
      where: { shareSlug: slug, isPublic: true }
    });
    if (!source) {
      throw new NotFoundException('Shared project link is missing or no longer available.');
    }

    const sourceData = await this.readProjectData(source);
    const clone = this.projectsRepository.create({
      name: `${source.name} (Draft)`,
      description: source.description,
      lastOpenedAt: new Date(),
      owner: actor.kind === 'user' ? ({ id: actor.userId } as UserEntity) : null,
      guestId: actor.kind === 'guest' ? actor.guestId : null
    });

    const saved = await this.projectsRepository.save(clone);
    saved.dataPath = this.getDataPath(saved.id);
    await this.writeProjectData(saved.id, saved.dataPath, sourceData);
    const updated = await this.projectsRepository.save(saved);
    return this.toProjectView(updated);
  }

  async exportProject(id: string, actor: ProjectActor, format: ProjectExportFormat): Promise<ProjectExportFile> {
    const project = await this.findOneEntity(id, actor);
    const projectData = await this.readProjectData(project);
    const frames = extractFrames(projectData);
    const fileBaseName = toSafeFileName(project.name || 'webster-project');

    if (format === 'json') {
      return {
        fileName: `${fileBaseName}.json`,
        mimeType: 'application/json; charset=utf-8',
        buffer: Buffer.from(JSON.stringify(projectData, null, 2), 'utf8')
      };
    }

    if (format === 'pdf') {
      return {
        fileName: `${fileBaseName}.pdf`,
        mimeType: 'application/pdf',
        buffer: createSimpleProjectPdf(project.name, project.description, frames)
      };
    }

    if (format === 'png') {
      return {
        fileName: `${fileBaseName}.png`,
        mimeType: 'image/png',
        buffer: createProjectPreviewPng(frames)
      };
    }

    const now = new Date();
    const stamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}_${String(now.getUTCHours()).padStart(2, '0')}-${String(now.getUTCMinutes()).padStart(2, '0')}-${String(now.getUTCSeconds()).padStart(2, '0')}`;
    return {
      fileName: `${fileBaseName}-${stamp}.webster`,
      mimeType: 'application/octet-stream',
      buffer: await createWebsterBinaryFile(projectData)
    };
  }

  async importWebsterProject(buffer: Buffer, actor: ProjectActor, fallbackName = 'Imported project'): Promise<ProjectView> {
    const parsed = await parseWebsterBinaryFile(buffer);
    const projectData = isRecord(parsed) ? parsed : { frames: [] };
    const name = deriveProjectNameForImport(projectData, fallbackName);
    return this.createFromImportedData(actor, {
      name,
      description: null,
      data: projectData
    });
  }

  async attachGuestProjectsToUser(guestId: string, userId: string): Promise<void> {
    await this.projectsRepository
      .createQueryBuilder()
      .update(ProjectEntity)
      .set({ owner: { id: userId } as UserEntity, guestId: null })
      .where('guestId = :guestId', { guestId })
      .execute();
  }

  private applyActorFilter(
    query: SelectQueryBuilder<ProjectEntity>,
    actor: ProjectActor
  ): void {
    if (actor.kind === 'user') {
      query.andWhere('project.ownerId = :ownerId', { ownerId: actor.userId });
      return;
    }
    query.andWhere('project.guestId = :guestId', { guestId: actor.guestId });
  }

  private async generateUniqueShareSlug(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = randomBytes(8).toString('hex');
      const existing = await this.projectsRepository.findOne({ where: { shareSlug: slug } });
      if (!existing) {
        return slug;
      }
    }

    throw new Error('Could not generate a unique share link slug.');
  }

  private getProjectDir(projectId: string): string {
    return join(process.cwd(), 'storage', 'projects', projectId);
  }

  private getDataPath(projectId: string): string {
    return join(this.getProjectDir(projectId), 'project.json');
  }

  private async writeProjectData(projectId: string, path: string, data: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const normalized = await externalizeDataUrls(data, this.getProjectDir(projectId));
    await writeFile(path, JSON.stringify(normalized), 'utf8');
  }

  private async readProjectData(project: ProjectEntity): Promise<Record<string, unknown>> {
    const path = project.dataPath || this.getDataPath(project.id);
    try {
      const content = await readFile(path, 'utf8');
      const parsed = JSON.parse(content) as unknown;
      if (!isRecord(parsed)) {
        return { frames: [] };
      }
      const hydrated = await hydrateStoredAssets(parsed, dirname(path));
      return isRecord(hydrated) ? hydrated : { frames: [] };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { frames: [] };
      }
      throw error;
    }
  }

  private async toProjectView(project: ProjectEntity): Promise<ProjectView> {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      data: await this.readProjectData(project),
      isPublic: project.isPublic,
      shareSlug: project.shareSlug,
      lastOpenedAt: project.lastOpenedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }
}

type ExportFrame = {
  name: string;
  width: number;
  height: number;
};

function extractFrames(data: Record<string, unknown>): ExportFrame[] {
  const rawFrames = data.frames;
  if (!Array.isArray(rawFrames)) {
    return [];
  }

  return rawFrames
    .map((entry, index) => {
      if (!isRecord(entry)) {
        return null;
      }

      const width = toPositiveNumber(entry.width, 1080);
      const height = toPositiveNumber(entry.height, 1080);
      const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : `Frame ${index + 1}`;

      return { name, width, height };
    })
    .filter((entry): entry is ExportFrame => entry !== null);
}

function createProjectPreviewPng(frames: ExportFrame[]): Buffer {
  const width = 1200;
  const height = 720;
  const pixelData = Buffer.alloc((width * 4 + 1) * height, 0);

  const setPixel = (x: number, y: number, red: number, green: number, blue: number, alpha = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const rowStart = y * (width * 4 + 1);
    const pixelStart = rowStart + 1 + x * 4;
    pixelData[pixelStart] = red;
    pixelData[pixelStart + 1] = green;
    pixelData[pixelStart + 2] = blue;
    pixelData[pixelStart + 3] = alpha;
  };

  const fillRect = (x: number, y: number, rectWidth: number, rectHeight: number, red: number, green: number, blue: number, alpha = 255) => {
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const endX = Math.min(width, Math.ceil(x + rectWidth));
    const endY = Math.min(height, Math.ceil(y + rectHeight));

    for (let yy = startY; yy < endY; yy += 1) {
      for (let xx = startX; xx < endX; xx += 1) {
        setPixel(xx, yy, red, green, blue, alpha);
      }
    }
  };

  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    const red = Math.round(237 + 7 * t);
    const green = Math.round(246 - 14 * t);
    const blue = Math.round(252 - 21 * t);
    fillRect(0, y, width, 1, red, green, blue);
  }

  fillRect(38, 38, width - 76, height - 76, 255, 255, 255, 255);
  fillRect(42, 42, width - 84, 64, 226, 242, 250, 255);

  const previewFrames = frames.slice(0, 6);
  if (previewFrames.length === 0) {
    fillRect(160, 170, width - 320, height - 260, 239, 245, 249, 255);
  } else {
    const columns = Math.min(3, previewFrames.length);
    const rows = Math.ceil(previewFrames.length / columns);
    const gap = 22;
    const gridTop = 140;
    const gridHeight = height - gridTop - 72;
    const tileWidth = (width - 120 - gap * (columns - 1)) / columns;
    const tileHeight = (gridHeight - gap * (rows - 1)) / rows;

    previewFrames.forEach((frame, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const tileX = 60 + column * (tileWidth + gap);
      const tileY = gridTop + row * (tileHeight + gap);

      fillRect(tileX, tileY, tileWidth, tileHeight, 241, 248, 252, 255);
      fillRect(tileX + 1, tileY + 1, tileWidth - 2, 1, 203, 224, 236, 255);

      const ratio = frame.width / Math.max(1, frame.height);
      const canvasMaxWidth = tileWidth - 30;
      const canvasMaxHeight = tileHeight - 34;
      let previewWidth = canvasMaxWidth;
      let previewHeight = canvasMaxWidth / Math.max(0.1, ratio);

      if (previewHeight > canvasMaxHeight) {
        previewHeight = canvasMaxHeight;
        previewWidth = canvasMaxHeight * ratio;
      }

      const previewX = tileX + (tileWidth - previewWidth) / 2;
      const previewY = tileY + (tileHeight - previewHeight) / 2;

      const hue = (index * 53) % 255;
      fillRect(previewX, previewY, previewWidth, previewHeight, 120 + (hue % 80), 180 + (hue % 50), 215 - (hue % 40), 255);
      fillRect(previewX + 2, previewY + 2, previewWidth - 4, previewHeight - 4, 255, 255, 255, 120);
    });
  }

  return encodePng(width, height, pixelData);
}

function createSimpleProjectPdf(projectName: string, description: string | null, frames: ExportFrame[]): Buffer {
  const lines = [
    `Webster Project Export`,
    `Name: ${projectName || 'Untitled project'}`,
    `Description: ${description?.trim() || 'n/a'}`,
    `Frames: ${frames.length}`,
    ...frames.slice(0, 14).map((frame, index) => `#${index + 1} ${frame.name} - ${frame.width} x ${frame.height}`)
  ];

  const contentLines = [
    'BT',
    '/F1 14 Tf',
    '50 795 Td',
    '18 TL',
    ...lines.map((line, index) => `${index === 0 ? '' : 'T* ' }(${escapePdfText(line)}) Tj`),
    'ET'
  ];

  const streamContent = `${contentLines.join('\n')}\n`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}endstream\nendobj\n`
  ];

  const header = '%PDF-1.4\n';
  const chunks: Buffer[] = [Buffer.from(header, 'utf8')];
  const offsets = [0];

  for (const object of objects) {
    const currentSize = chunks.reduce((size, chunk) => size + chunk.length, 0);
    offsets.push(currentSize);
    chunks.push(Buffer.from(object, 'utf8'));
  }

  const xrefOffset = chunks.reduce((size, chunk) => size + chunk.length, 0);
  const xrefRows = ['0000000000 65535 f '];
  for (let index = 1; index < offsets.length; index += 1) {
    xrefRows.push(`${offsets[index].toString().padStart(10, '0')} 00000 n `);
  }

  const xref = `xref\n0 ${objects.length + 1}\n${xrefRows.join('\n')}\n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  chunks.push(Buffer.from(xref, 'utf8'));
  chunks.push(Buffer.from(trailer, 'utf8'));

  return Buffer.concat(chunks);
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function toSafeFileName(input: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'webster-project';
}

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.round(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const ASSET_URI_PREFIX = 'asset://';
const DATA_URL_PATTERN = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i;

async function externalizeDataUrls(value: unknown, projectDir: string): Promise<unknown> {
  if (typeof value === 'string') {
    const parsed = parseDataUrl(value);
    if (!parsed) return value;

    const fileName = `${createHash('sha256').update(parsed.buffer).digest('hex')}.${mimeToExtension(parsed.mimeType)}`;
    const assetDir = join(projectDir, 'assets');
    const assetPath = join(assetDir, fileName);
    await mkdir(assetDir, { recursive: true });
    await writeFile(assetPath, parsed.buffer);
    return `${ASSET_URI_PREFIX}assets/${fileName}`;
  }

  if (Array.isArray(value)) {
    const items = await Promise.all(value.map((entry) => externalizeDataUrls(entry, projectDir)));
    return items;
  }

  if (isRecord(value)) {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, entry]) => [key, await externalizeDataUrls(entry, projectDir)] as const)
    );
    return Object.fromEntries(entries);
  }

  return value;
}

async function hydrateStoredAssets(value: unknown, projectDir: string): Promise<unknown> {
  if (typeof value === 'string' && value.startsWith(ASSET_URI_PREFIX)) {
    const relativePath = value.slice(ASSET_URI_PREFIX.length).replace(/\\/g, '/');
    const diskPath = join(projectDir, relativePath);
    try {
      const buffer = await readFile(diskPath);
      const mimeType = extensionToMime(diskPath);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      if (isNotFoundError(error)) return '';
      throw error;
    }
  }

  if (Array.isArray(value)) {
    const items = await Promise.all(value.map((entry) => hydrateStoredAssets(entry, projectDir)));
    return items;
  }

  if (isRecord(value)) {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, entry]) => [key, await hydrateStoredAssets(entry, projectDir)] as const)
    );
    return Object.fromEntries(entries);
  }

  return value;
}

function parseDataUrl(value: string): { mimeType: string; buffer: Buffer } | null {
  const match = DATA_URL_PATTERN.exec(value.trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const payload = match[2].replace(/\s+/g, '');
  return {
    mimeType,
    buffer: Buffer.from(payload, 'base64')
  };
}

function mimeToExtension(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

function extensionToMime(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith('.png')) return 'image/png';
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerPath.endsWith('.webp')) return 'image/webp';
  if (lowerPath.endsWith('.gif')) return 'image/gif';
  if (lowerPath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

const WEBSTER_PROJECT_FILENAME = 'project.json';
const WEBSTER_MANIFEST_FILENAME = 'manifest.json';
const WEBSTER_CONTAINER_VERSION = 1;
const WEBSTER_BINARY_MAGIC = 'WEBSTERBIN1';

type WebsterManifest = {
  format: 'webster';
  version: number;
  createdAt: string;
  projectFile: string;
  projectBytes: number;
  projectSha256: string;
};

async function createWebsterBinaryFile(data: Record<string, unknown>): Promise<Buffer> {
  const zip = new JSZip();
  const projectJson = JSON.stringify(data, null, 2);
  const projectBytes = Buffer.from(projectJson, 'utf8');
  const manifest: WebsterManifest = {
    format: 'webster',
    version: WEBSTER_CONTAINER_VERSION,
    createdAt: new Date().toISOString(),
    projectFile: WEBSTER_PROJECT_FILENAME,
    projectBytes: projectBytes.byteLength,
    projectSha256: sha256Hex(projectBytes)
  };

  zip.file(WEBSTER_PROJECT_FILENAME, projectJson);
  zip.file(WEBSTER_MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));
  const zipBytes = Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
  const checksumBytes = Buffer.from(sha256Hex(zipBytes), 'utf8');
  const magicBytes = Buffer.from(WEBSTER_BINARY_MAGIC, 'utf8');
  const headerSize = magicBytes.length + 1 + 4 + checksumBytes.length;
  const out = Buffer.alloc(headerSize + zipBytes.byteLength);

  magicBytes.copy(out, 0);
  out[magicBytes.length] = WEBSTER_CONTAINER_VERSION;
  out.writeUInt32LE(zipBytes.byteLength, magicBytes.length + 1);
  checksumBytes.copy(out, magicBytes.length + 1 + 4);
  zipBytes.copy(out, headerSize);
  return out;
}

async function parseWebsterBinaryFile(rawData: Buffer): Promise<unknown> {
  const magicBytes = Buffer.from(WEBSTER_BINARY_MAGIC, 'utf8');
  const headerSize = magicBytes.length + 1 + 4 + 64;
  if (rawData.byteLength < headerSize + 1) {
    throw new Error('Broken file: Webster container is too short.');
  }
  if (!rawData.subarray(0, magicBytes.length).equals(magicBytes)) {
    throw new Error('Unsupported file: Webster binary signature is missing.');
  }
  const version = rawData[magicBytes.length];
  if (version !== WEBSTER_CONTAINER_VERSION) {
    throw new Error(`Unsupported Webster binary version: ${String(version)}.`);
  }
  const payloadLength = rawData.readUInt32LE(magicBytes.length + 1);
  const expectedChecksum = rawData.subarray(magicBytes.length + 1 + 4, headerSize).toString('utf8').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedChecksum)) {
    throw new Error('Broken file: checksum header is invalid.');
  }
  const payload = rawData.subarray(headerSize);
  if (payload.byteLength !== payloadLength) {
    throw new Error('Broken file: payload size mismatch.');
  }
  const actualChecksum = sha256Hex(payload);
  if (actualChecksum !== expectedChecksum) {
    throw new Error('Broken file: payload checksum mismatch.');
  }

  const zip = await JSZip.loadAsync(payload);
  const manifestFile = zip.file(WEBSTER_MANIFEST_FILENAME);
  if (!manifestFile) throw new Error('Broken file: manifest.json is missing.');
  const manifest = JSON.parse(await manifestFile.async('string')) as Partial<WebsterManifest>;
  if (manifest.format !== 'webster') throw new Error('Unsupported format: expected webster.');
  if (manifest.projectFile !== WEBSTER_PROJECT_FILENAME) throw new Error('Broken file: manifest project file is invalid.');

  const projectFile = zip.file(WEBSTER_PROJECT_FILENAME);
  if (!projectFile) throw new Error('Broken file: project.json is missing.');
  const projectBytes = Buffer.from(await projectFile.async('uint8array'));
  if (typeof manifest.projectBytes !== 'number' || projectBytes.byteLength !== manifest.projectBytes) {
    throw new Error('Broken file: project size mismatch.');
  }
  const projectChecksum = sha256Hex(projectBytes);
  if (typeof manifest.projectSha256 !== 'string' || projectChecksum !== manifest.projectSha256.toLowerCase()) {
    throw new Error('Broken file: project checksum mismatch.');
  }

  const parsedProject = JSON.parse(projectBytes.toString('utf8')) as unknown;
  return hydratePortableProjectFromZip(parsedProject, zip);
}

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function deriveProjectNameForImport(data: Record<string, unknown>, fallback: string): string {
  const frames = data.frames;
  if (!Array.isArray(frames) || frames.length === 0) {
    return fallback;
  }
  const first = frames[0];
  if (!isRecord(first) || typeof first.name !== 'string' || !first.name.trim()) {
    return fallback;
  }
  const name = first.name.trim().slice(0, 120);
  return name || fallback;
}

async function hydratePortableProjectFromZip(project: unknown, zip: JSZip): Promise<unknown> {
  if (typeof project === 'string') {
    if (!project.startsWith('assets/')) {
      return project;
    }
    const file = zip.file(project);
    if (!file) {
      return project;
    }
    const base64 = await file.async('base64');
    return `data:${mimeFromFilename(project)};base64,${base64}`;
  }

  if (Array.isArray(project)) {
    const items = await Promise.all(project.map((item) => hydratePortableProjectFromZip(item, zip)));
    return items;
  }

  if (isRecord(project)) {
    const entries = await Promise.all(
      Object.entries(project).map(async ([key, value]) => [key, await hydratePortableProjectFromZip(value, zip)] as const)
    );
    return Object.fromEntries(entries);
  }

  return project;
}

function mimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.svg') || lower.endsWith('.svg+xml')) return 'image/svg+xml';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'image/tiff';
  return 'image/png';
}

function encodePng(width: number, height: number, pixelData: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const compressed = require('zlib').deflateSync(pixelData);

  return Buffer.concat([
    signature,
    createPngChunk('IHDR', ihdrData),
    createPngChunk('IDAT', compressed),
    createPngChunk('IEND', Buffer.alloc(0))
  ]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
