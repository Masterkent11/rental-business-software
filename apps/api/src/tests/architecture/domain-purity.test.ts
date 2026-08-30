import { describe, expect, it } from 'vitest';
import { loadAllSourceFiles } from './arch-helper.ts';

describe('Architecture: Domain Purity', () => {
  const allFiles = loadAllSourceFiles();
  const domainFiles = allFiles.filter((f) => f.layer === 'domain' && !f.isTest);

  it('Domain has NO dependency on Supabase', () => {
    const violations: string[] = [];
    for (const file of domainFiles) {
      for (const imp of file.imports) {
        if (imp.raw.includes('supabase') || imp.resolvedLayer === 'infrastructure') {
          violations.push(`${file.relPath} imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('Domain has NO dependency on PostgreSQL', () => {
    const violations: string[] = [];
    for (const file of domainFiles) {
      for (const imp of file.imports) {
        if (imp.raw.includes('postgres') || imp.raw.includes('pg') || imp.raw === 'postgres') {
          violations.push(`${file.relPath} imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('Domain has NO dependency on NestJS or Fastify', () => {
    const violations: string[] = [];
    for (const file of domainFiles) {
      for (const imp of file.imports) {
        if (imp.raw.includes('@nestjs') || imp.raw.includes('fastify')) {
          violations.push(`${file.relPath} imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
