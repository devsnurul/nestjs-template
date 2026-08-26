import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'node:fs';

export interface FileReaderOptions {
  sheet?: number | string;
  headerRow?: number;
  range?: number;
}

export interface FileReaderResult {
  headers: string[];
  rows: Record<string, unknown>[];
  sheetName: string;
  totalRows: number;
}

export type FileSource = string | Buffer;

@Injectable()
export class FileReaderService {
  private readonly SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.ods'];

  async read(
    source: FileSource,
    options?: FileReaderOptions,
  ): Promise<FileReaderResult> {
    const data = await this.loadData(source);
    const workbook = XLSX.read(data, { type: 'buffer', cellDates: true });

    const sheetName = this.resolveSheet(workbook, options?.sheet);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new BadRequestException(`Sheet "${sheetName}" not found`);
    }

    const headerRow = options?.headerRow ?? 1;
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: headerRow === 1 ? undefined : headerRow,
      defval: null,
      range: options?.range,
    });

    if (jsonData.length === 0) {
      return { headers: [], rows: [], sheetName, totalRows: 0 };
    }

    const headers = Object.keys(jsonData[0]);
    return { headers, rows: jsonData, sheetName, totalRows: jsonData.length };
  }

  async readRaw(
    source: FileSource,
    options?: FileReaderOptions,
  ): Promise<string[][]> {
    const data = await this.loadData(source);
    const workbook = XLSX.read(data, { type: 'buffer', cellDates: true });

    const sheetName = this.resolveSheet(workbook, options?.sheet);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new BadRequestException(`Sheet "${sheetName}" not found`);
    }

    return XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
    });
  }

  async getSheets(source: FileSource): Promise<string[]> {
    const data = await this.loadData(source);
    const workbook = XLSX.read(data, { type: 'buffer' });
    return workbook.SheetNames;
  }

  private isUrl(source: string): boolean {
    return source.startsWith('http://') || source.startsWith('https://');
  }

  private async loadData(source: FileSource): Promise<Buffer> {
    if (typeof source === 'string') {
      if (this.isUrl(source)) {
        return this.fetchFromUrl(source);
      }
      if (!existsSync(source)) {
        throw new BadRequestException(`File not found: ${source}`);
      }
      const ext = this.getExtension(source);
      if (!this.SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new BadRequestException(
          `Unsupported file format "${ext}". Supported: ${this.SUPPORTED_EXTENSIONS.join(', ')}`,
        );
      }
      return readFileSync(source);
    }
    return source;
  }

  private async fetchFromUrl(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(
        `Failed to fetch file from URL (${response.status} ${response.statusText}): ${url}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private resolveSheet(
    workbook: XLSX.WorkBook,
    sheet?: number | string,
  ): string {
    if (sheet === undefined || sheet === 0) {
      return workbook.SheetNames[0];
    }
    if (typeof sheet === 'number') {
      const name = workbook.SheetNames[sheet];
      if (!name) {
        throw new BadRequestException(
          `Sheet at index ${sheet} not found. Available: ${workbook.SheetNames.length}`,
        );
      }
      return name;
    }
    if (!workbook.SheetNames.includes(sheet)) {
      throw new BadRequestException(
        `Sheet "${sheet}" not found. Available: ${workbook.SheetNames.join(', ')}`,
      );
    }
    return sheet;
  }

  private getExtension(filePath: string): string {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    return ext || '';
  }
}
