import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersService {
  getLogisticsAdminSignature(): { stream: fs.ReadStream; mimeType: string } {
    const configuredPath = process.env.LOGISTICS_ADMIN_SIGNATURE_PATH;
    const candidates = [
      configuredPath,
      path.resolve(process.cwd(), '.local-assets/signatures/pungki-signature.png'),
      path.resolve(process.cwd(), '../.local-assets/signatures/pungki-signature.png'),
      path.resolve(process.cwd(), 'TTD_Ibu.png'),
      path.resolve(process.cwd(), '../TTD_Ibu.png'),
    ].filter(Boolean) as string[];

    let resolvedFile: string | null = null;
    for (const candidate of candidates) {
      const fullPath = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        resolvedFile = fullPath;
        break;
      }
    }

    if (!resolvedFile) {
      throw new NotFoundException('Logistics Admin signature file not found');
    }

    const ext = path.extname(resolvedFile).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
    const stream = fs.createReadStream(resolvedFile);
    return { stream, mimeType };
  }
}

