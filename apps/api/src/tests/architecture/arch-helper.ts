import fs from 'node:fs';
import path from 'node:path';

export const srcDir = path.resolve(__dirname, '../../').replace(/\\/g, '/');

export interface SourceFile {
  filePath: string;
  relPath: string;
  layer: 'domain' | 'ports' | 'application' | 'infrastructure' | 'controller' | 'composition' | 'dto' | 'mapper' | 'other';
  isTest: boolean;
  imports: { raw: string; resolved: string; resolvedLayer: string | 'external'; isExternal: boolean }[];
}

export function getLayer(relPath: string): SourceFile['layer'] {
  if (relPath.startsWith('domain/')) return 'domain';
  if (relPath.startsWith('application/ports/') || relPath === 'application/index.ts') return 'ports';
  if (relPath.startsWith('application/')) return 'application';
  if (relPath.startsWith('infrastructure/')) return 'infrastructure';
  if (relPath.endsWith('.controller.ts')) return 'controller';
  if (relPath.includes('/dto/')) return 'dto';
  if (relPath.includes('/mappers/')) return 'mapper';
  if (
    relPath.endsWith('.module.ts') ||
    relPath.endsWith('.tokens.ts') ||
    relPath === 'app.module.ts' ||
    relPath === 'main.ts'
  ) {
    return 'composition';
  }
  return 'other';
}

export function getAllSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results = results.concat(getAllSourceFiles(fullPath));
    } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.js'))) {
      results.push(fullPath);
    }
  }
  return results;
}

export function parseImports(filePath: string, content: string): SourceFile['imports'] {
  const imports: SourceFile['imports'] = [];
  const importRegex =
    /(?:import|export)\s+(?:(?:type\s+)?(?:[\w*\s{},$]+)\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)|require\(['"]([^'"]+)['"]\)/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3];
    if (!raw) continue;

    if (raw.startsWith('.')) {
      const fileDir = path.dirname(filePath);
      let targetPath = path.resolve(fileDir, raw).replace(/\\/g, '/');
      if (!targetPath.endsWith('.ts') && !targetPath.endsWith('.js')) {
        if (fs.existsSync(targetPath + '.ts')) {
          targetPath = targetPath + '.ts';
        } else if (fs.existsSync(path.join(targetPath, 'index.ts'))) {
          targetPath = path.join(targetPath, 'index.ts').replace(/\\/g, '/');
        }
      }
      const rel = path.relative(srcDir, targetPath).replace(/\\/g, '/');
      imports.push({
        raw,
        resolved: targetPath,
        resolvedLayer: getLayer(rel),
        isExternal: false,
      });
    } else if (raw.startsWith('@/')) {
      let targetPath = path.resolve(srcDir, raw.slice(2)).replace(/\\/g, '/');
      if (!targetPath.endsWith('.ts') && !targetPath.endsWith('.js')) {
        if (fs.existsSync(targetPath + '.ts')) {
          targetPath = targetPath + '.ts';
        } else if (fs.existsSync(path.join(targetPath, 'index.ts'))) {
          targetPath = path.join(targetPath, 'index.ts').replace(/\\/g, '/');
        }
      }
      const rel = path.relative(srcDir, targetPath).replace(/\\/g, '/');
      imports.push({
        raw,
        resolved: targetPath,
        resolvedLayer: getLayer(rel),
        isExternal: false,
      });
    } else {
      imports.push({
        raw,
        resolved: raw,
        resolvedLayer: 'external',
        isExternal: true,
      });
    }
  }

  return imports;
}

export function loadAllSourceFiles(): SourceFile[] {
  const allFiles = getAllSourceFiles(srcDir);
  return allFiles.map((filePath) => {
    const relPath = path.relative(srcDir, filePath).replace(/\\/g, '/');
    const isTest =
      relPath.includes('__tests__') ||
      relPath.includes('.test.') ||
      relPath.includes('.spec.') ||
      relPath.startsWith('tests/');
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = parseImports(filePath, content);
    return {
      filePath,
      relPath,
      layer: getLayer(relPath),
      isTest,
      imports,
    };
  });
}
