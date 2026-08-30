import { describe, expect, it } from 'vitest';
import { loadAllSourceFiles } from './arch-helper.ts';

describe('Architecture: Controller Boundaries', () => {
  const allFiles = loadAllSourceFiles();
  const controllers = allFiles.filter((f) => f.layer === 'controller' && !f.isTest);

  it('No controller depends directly on concrete infrastructure adapters', () => {
    const violations: string[] = [];
    for (const file of controllers) {
      for (const imp of file.imports) {
        if (imp.resolvedLayer === 'infrastructure') {
          violations.push(`${file.relPath} directly imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('No controller directly imports or injects Repository or Storage ports', () => {
    const violations: string[] = [];
    for (const file of controllers) {
      for (const imp of file.imports) {
        if (
          imp.raw.includes('repository') ||
          imp.raw.includes('document-storage') ||
          imp.raw.includes('media-storage') ||
          imp.raw.includes('panorama-processor')
        ) {
          violations.push(`${file.relPath} directly imports port ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('No controller performs inline capability checking (authorization belongs in application layer)', () => {
    const violations: string[] = [];
    for (const file of controllers) {
      for (const imp of file.imports) {
        if (imp.raw.includes('identity/identity') || imp.raw.includes('identity/capability')) {
          violations.push(`${file.relPath} imports domain identity logic ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('No use case directly instantiates a concrete infrastructure adapter', () => {
    const useCases = allFiles.filter((f) => f.layer === 'application' && !f.isTest);
    const violations: string[] = [];
    for (const file of useCases) {
      for (const imp of file.imports) {
        if (imp.resolvedLayer === 'infrastructure') {
          violations.push(`${file.relPath} imports ${imp.raw}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
