import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './project.entity';
import { UserEntity } from '../users/user.entity';

export type ProjectExportFormat = 'json' | 'png' | 'pdf';

export type ProjectExportFile = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>
  ) {}

  findAll(ownerId: string): Promise<ProjectEntity[]> {
    return this.projectsRepository.find({
      where: { owner: { id: ownerId } },
      order: { updatedAt: 'DESC' }
    });
  }

  async findOne(id: string, ownerId: string): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOne({ where: { id, owner: { id: ownerId } } });
    if (!project) {
      throw new NotFoundException(`Project with id '${id}' was not found`);
    }

    return project;
  }

  async create(dto: CreateProjectDto, ownerId: string): Promise<ProjectEntity> {
    const project = this.projectsRepository.create({
      name: dto.name,
      description: dto.description?.trim() || null,
      data: dto.data,
      owner: { id: ownerId } as UserEntity
    });

    return this.projectsRepository.save(project);
  }

  async update(id: string, dto: UpdateProjectDto, ownerId: string): Promise<ProjectEntity> {
    const project = await this.findOne(id, ownerId);

    if (dto.name !== undefined) {
      project.name = dto.name;
    }
    if (dto.description !== undefined) {
      project.description = dto.description?.trim() || null;
    }
    if (dto.data !== undefined) {
      project.data = dto.data;
    }

    return this.projectsRepository.save(project);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const project = await this.findOne(id, ownerId);
    await this.projectsRepository.remove(project);
  }

  async exportProject(id: string, ownerId: string, format: ProjectExportFormat): Promise<ProjectExportFile> {
    const project = await this.findOne(id, ownerId);
    const frames = extractFrames(project.data);
    const fileBaseName = toSafeFileName(project.name || 'webster-project');

    if (format === 'json') {
      return {
        fileName: `${fileBaseName}.json`,
        mimeType: 'application/json; charset=utf-8',
        buffer: Buffer.from(JSON.stringify(project.data, null, 2), 'utf8')
      };
    }

    if (format === 'pdf') {
      return {
        fileName: `${fileBaseName}.pdf`,
        mimeType: 'application/pdf',
        buffer: createSimpleProjectPdf(project.name, project.description, frames)
      };
    }

    return {
      fileName: `${fileBaseName}.png`,
      mimeType: 'image/png',
      buffer: createProjectPreviewPng(frames)
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
