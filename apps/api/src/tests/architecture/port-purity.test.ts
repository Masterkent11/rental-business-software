import { describe, expect, it } from 'vitest';
import { loadAllSourceFiles } from './arch-helper.ts';

describe('Architecture: Port Purity', () => {
  const allFiles = loadAllSourceFiles();
  const portFiles = allFiles.filter((f) => f.layer === 'ports' && !f.isTest);

  it('Ports define technology-independent interfaces', () => {
    const violations: string[] = [];
    for (const file of portFiles) {
      for (const imp of file.imports) {
        if (
          imp.resolvedLayer === 'infrastructure' ||
          imp.raw.includes('postgres') ||
          imp.raw.includes('@nestjs') ||
          imp.raw.includes('@supabase')
        ) {
          violations.push(`${file.relPath} violates port purity with ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
