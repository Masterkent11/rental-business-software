import { describe, expect, it } from 'vitest';
import { loadAllSourceFiles } from './arch-helper.ts';

describe('Architecture: Application Purity', () => {
  const allFiles = loadAllSourceFiles();
  const appFiles = allFiles.filter((f) => f.layer === 'application' && !f.isTest);

  it('Application use cases have NO dependency on Infrastructure', () => {
    const violations: string[] = [];
    for (const file of appFiles) {
      for (const imp of file.imports) {
        if (imp.resolvedLayer === 'infrastructure') {
          violations.push(`${file.relPath} imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('Application use cases have NO dependency on Supabase', () => {
    const violations: string[] = [];
    for (const file of appFiles) {
      for (const imp of file.imports) {
        if (imp.raw.includes('supabase') || imp.raw.includes('@supabase')) {
          violations.push(`${file.relPath} imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('Application use cases have NO dependency on PostgreSQL', () => {
    const violations: string[] = [];
    for (const file of appFiles) {
      for (const imp of file.imports) {
        if (imp.raw === 'postgres' || imp.raw.includes('pg') || imp.raw.includes('postgres/')) {
          violations.push(`${file.relPath} imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
