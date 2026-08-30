import { describe, expect, it } from 'vitest';
import { loadAllSourceFiles } from './arch-helper.ts';

describe('Architecture: Circular Dependencies', () => {
  const allFiles = loadAllSourceFiles();
  const fileMap = new Map(allFiles.map((f) => [f.filePath, f]));

  it('No circular dependencies crossing architectural layer boundaries', () => {
    const cycles: string[] = [];

    function checkCycle(start: string, current: string, visited: Set<string>, path: string[]) {
      const file = fileMap.get(current);
      if (!file) return;

      for (const imp of file.imports) {
        if (imp.isExternal) continue;
        const target = imp.resolved;
        if (!fileMap.has(target)) continue;

        if (target === start && path.length > 1) {
          const layers = [...path.map((p) => fileMap.get(p)?.layer), file.layer];
          const uniqueLayers = new Set(layers);
          if (uniqueLayers.size > 1) {
            cycles.push([...path, current, target].join(' -> '));
          }
          return;
        }

        if (!visited.has(target)) {
          visited.add(target);
          checkCycle(start, target, new Set(visited), [...path, current]);
        }
      }
    }

    for (const file of allFiles) {
      if (file.isTest) continue;
      checkCycle(file.filePath, file.filePath, new Set([file.filePath]), []);
    }

    expect(cycles).toEqual([]);
  });
});
