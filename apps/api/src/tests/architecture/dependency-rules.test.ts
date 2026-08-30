import { describe, expect, it } from 'vitest';
import { loadAllSourceFiles } from './arch-helper.ts';

describe('Architecture: Overall Dependency Rules', () => {
  const allFiles = loadAllSourceFiles();

  it('Presentation / Controllers depend only on Application, Ports, Domain, and DI tokens', () => {
    const controllers = allFiles.filter((f) => f.layer === 'controller' && !f.isTest);
    const violations: string[] = [];

    for (const file of controllers) {
      for (const imp of file.imports) {
        if (imp.resolvedLayer === 'infrastructure') {
          violations.push(`${file.relPath} directly imports concrete adapter ${imp.raw}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('Infrastructure depends only on Application Ports, Domain, and shared utilities', () => {
    const infraFiles = allFiles.filter((f) => f.layer === 'infrastructure' && !f.isTest);
    const violations: string[] = [];

    for (const file of infraFiles) {
      for (const imp of file.imports) {
        if (imp.resolvedLayer === 'controller' || imp.resolvedLayer === 'composition') {
          violations.push(`${file.relPath} improperly imports presentation ${imp.raw}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
