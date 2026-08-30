import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = path.resolve(__dirname, '..').replace(/\\/g, '/');

interface SourceFile {
  filePath: string;
  relPath: string;
  layer: 'domain' | 'ports' | 'application' | 'infrastructure' | 'controller' | 'composition' | 'dto' | 'mapper' | 'other';
  isTest: boolean;
  imports: { raw: string; resolved: string; resolvedLayer: string | 'external'; isExternal: boolean }[];
}

function getLayer(relPath: string): SourceFile['layer'] {
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

function getAllSourceFiles(dir: string): string[] {
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

function parseImports(filePath: string, content: string): SourceFile['imports'] {
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

      if (!fs.existsSync(targetPath) && fs.existsSync(targetPath + '.ts')) {
        targetPath = targetPath + '.ts';
      } else if (!fs.existsSync(targetPath) && fs.existsSync(targetPath + '.js')) {
        targetPath = targetPath + '.js';
      } else if (fs.existsSync(path.join(targetPath, 'index.ts'))) {
        targetPath = path.join(targetPath, 'index.ts').replace(/\\/g, '/');
      } else if (fs.existsSync(path.join(targetPath, 'index.js'))) {
        targetPath = path.join(targetPath, 'index.js').replace(/\\/g, '/');
      }

      const relResolved = targetPath.startsWith(srcDir)
        ? targetPath.slice(srcDir.length + 1)
        : targetPath;
      const resolvedLayer = targetPath.startsWith(srcDir) ? getLayer(relResolved) : 'external';
      imports.push({ raw, resolved: relResolved, resolvedLayer, isExternal: false });
    } else if (raw.startsWith('@/')) {
      let targetPath = path.resolve(srcDir, raw.slice(2)).replace(/\\/g, '/');
      if (!fs.existsSync(targetPath) && fs.existsSync(targetPath + '.ts')) {
        targetPath = targetPath + '.ts';
      } else if (!fs.existsSync(targetPath) && fs.existsSync(targetPath + '.js')) {
        targetPath = targetPath + '.js';
      } else if (fs.existsSync(path.join(targetPath, 'index.ts'))) {
        targetPath = path.join(targetPath, 'index.ts').replace(/\\/g, '/');
      } else if (fs.existsSync(path.join(targetPath, 'index.js'))) {
        targetPath = path.join(targetPath, 'index.js').replace(/\\/g, '/');
      }
      const relResolved = targetPath.startsWith(srcDir)
        ? targetPath.slice(srcDir.length + 1)
        : targetPath;
      const resolvedLayer = targetPath.startsWith(srcDir) ? getLayer(relResolved) : 'external';
      imports.push({ raw, resolved: relResolved, resolvedLayer, isExternal: false });
    } else {
      imports.push({ raw, resolved: raw, resolvedLayer: 'external', isExternal: true });
    }
  }

  return imports;
}

describe('Strict Clean Architecture + Hexagonal Boundaries (Specification Enforcement)', () => {
  const allFilePaths = getAllSourceFiles(srcDir);
  const allFiles: SourceFile[] = allFilePaths.map((filePath) => {
    const relPath = filePath.slice(srcDir.length + 1);
    const content = fs.readFileSync(filePath, 'utf-8');
    const isTest =
      relPath.includes('__tests__') ||
      relPath.includes('.test.') ||
      relPath.includes('.spec.') ||
      relPath.startsWith('tests/');
    return {
      filePath,
      relPath,
      layer: getLayer(relPath),
      isTest,
      imports: parseImports(filePath, content),
    };
  });

  // Layer 1: Domain Purity
  it('1. Domain has NO Supabase dependency', () => {
    const domainFiles = allFiles.filter((f) => f.layer === 'domain' && !f.isTest);
    const violations = domainFiles.flatMap((f) =>
      f.imports
        .filter((i) => i.raw.includes('supabase') || i.resolved.includes('supabase'))
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('2. Domain has NO PostgreSQL dependency', () => {
    const domainFiles = allFiles.filter((f) => f.layer === 'domain' && !f.isTest);
    const violations = domainFiles.flatMap((f) =>
      f.imports
        .filter(
          (i) =>
            i.raw.includes('postgres') ||
            i.raw.includes('pg') ||
            i.resolved.includes('postgres') ||
            i.resolved.includes('.pg'),
        )
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('3. Domain has NO NestJS or Fastify dependency', () => {
    const domainFiles = allFiles.filter((f) => f.layer === 'domain' && !f.isTest);
    const violations = domainFiles.flatMap((f) =>
      f.imports
        .filter((i) => i.raw.includes('@nestjs') || i.raw.includes('fastify'))
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('4. Domain has NO Application or Ports dependency', () => {
    const domainFiles = allFiles.filter((f) => f.layer === 'domain' && !f.isTest);
    const violations = domainFiles.flatMap((f) =>
      f.imports
        .filter((i) => !i.isExternal && (i.resolvedLayer === 'application' || i.resolvedLayer === 'ports'))
        .map((i) => ({ file: f.relPath, import: i.raw, target: i.resolved })),
    );
    expect(violations).toEqual([]);
  });

  it('5. Domain has NO Modules dependency', () => {
    const domainFiles = allFiles.filter((f) => f.layer === 'domain' && !f.isTest);
    const violations = domainFiles.flatMap((f) =>
      f.imports
        .filter(
          (i) =>
            !i.isExternal &&
            (i.resolvedLayer === 'controller' ||
              i.resolvedLayer === 'composition' ||
              i.resolvedLayer === 'dto' ||
              i.resolvedLayer === 'mapper' ||
              i.resolved.startsWith('modules/')),
        )
        .map((i) => ({ file: f.relPath, import: i.raw, target: i.resolved })),
    );
    expect(violations).toEqual([]);
  });

  // Layer 2: Application Purity
  it('6. Application use cases have NO dependency on Infrastructure', () => {
    const appFiles = allFiles.filter((f) => f.layer === 'application' && !f.isTest);
    const violations = appFiles.flatMap((f) =>
      f.imports
        .filter((i) => !i.isExternal && i.resolvedLayer === 'infrastructure')
        .map((i) => ({ file: f.relPath, import: i.raw, target: i.resolved })),
    );
    expect(violations).toEqual([]);
  });

  it('7. Application use cases have NO dependency on Supabase SDK', () => {
    const appFiles = allFiles.filter((f) => f.layer === 'application' && !f.isTest);
    const violations = appFiles.flatMap((f) =>
      f.imports
        .filter((i) => i.raw.includes('@supabase') || i.raw.includes('supabase'))
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('8. Application use cases have NO dependency on PostgreSQL SDK', () => {
    const appFiles = allFiles.filter((f) => f.layer === 'application' && !f.isTest);
    const violations = appFiles.flatMap((f) =>
      f.imports
        .filter(
          (i) =>
            i.raw === 'postgres' ||
            i.raw.includes('postgres/') ||
            (i.raw.includes('.pg') && !i.raw.includes('package')),
        )
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('9. Application must never import Modules', () => {
    const appFiles = allFiles.filter((f) => (f.layer === 'application' || f.layer === 'ports') && !f.isTest);
    const violations = appFiles.flatMap((f) =>
      f.imports
        .filter(
          (i) =>
            !i.isExternal &&
            (i.resolvedLayer === 'controller' ||
              i.resolvedLayer === 'composition' ||
              i.resolvedLayer === 'dto' ||
              i.resolvedLayer === 'mapper' ||
              i.resolved.startsWith('modules/')),
        )
        .map((i) => ({ file: f.relPath, import: i.raw, target: i.resolved })),
    );
    expect(violations).toEqual([]);
  });

  // Layer 3: Infrastructure Isolation
  it('10. Infrastructure must never import Modules', () => {
    const infraFiles = allFiles.filter((f) => f.layer === 'infrastructure' && !f.isTest);
    const violations = infraFiles.flatMap((f) =>
      f.imports
        .filter(
          (i) =>
            !i.isExternal &&
            (i.resolvedLayer === 'controller' ||
              i.resolvedLayer === 'composition' ||
              i.resolvedLayer === 'dto' ||
              i.resolvedLayer === 'mapper' ||
              i.resolved.startsWith('modules/')),
        )
        .map((i) => ({ file: f.relPath, import: i.raw, target: i.resolved })),
    );
    expect(violations).toEqual([]);
  });

  it('11. Infrastructure implements Application ports; it must not redefine business ports elsewhere', () => {
    const infraFiles = allFiles.filter((f) => f.layer === 'infrastructure' && !f.isTest);
    const concreteAdapters = infraFiles.filter(
      (f) =>
        f.relPath.endsWith('.repository.ts') ||
        f.relPath.endsWith('.adapter.ts') ||
        f.relPath.endsWith('.provider.ts'),
    );
    expect(concreteAdapters.length).toBeGreaterThan(0);
    for (const adapter of concreteAdapters) {
      if (adapter.relPath.includes('system-clock') || adapter.relPath.includes('uuid-generator')) {
        const importsPort = adapter.imports.some((i) => i.resolvedLayer === 'ports');
        expect(importsPort).toBe(true);
      }
    }
  });

  // Layer 4: Modules & Controller Boundaries
  it('12. No Controller -> Concrete Infrastructure Adapter dependency', () => {
    const controllerFiles = allFiles.filter((f) => f.layer === 'controller' && !f.isTest);
    const violations = controllerFiles.flatMap((f) =>
      f.imports
        .filter((i) => !i.isExternal && i.resolvedLayer === 'infrastructure')
        .map((i) => ({ file: f.relPath, import: i.raw, target: i.resolved })),
    );
    expect(violations).toEqual([]);
  });

  it('13. Controllers must never depend directly on repositories, storage ports, database clients, or payment gateways', () => {
    const controllerFiles = allFiles.filter((f) => f.layer === 'controller' && !f.isTest);
    const violations = controllerFiles.flatMap((f) =>
      f.imports
        .filter(
          (i) =>
            i.resolvedLayer === 'ports' &&
            (i.raw.includes('repository') ||
              i.raw.includes('storage') ||
              i.raw.includes('gateway') ||
              i.raw.includes('processor') ||
              i.raw.includes('clock') ||
              i.raw.includes('id-generator')),
        )
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('14. Controllers reside strictly under modules/*/controllers/', () => {
    const controllerFiles = allFiles.filter(
      (f) => f.relPath.endsWith('.controller.ts') && !f.isTest,
    );
    const misplaced = controllerFiles.filter(
      (f) => !f.relPath.includes('/controllers/'),
    );
    expect(misplaced.map((f) => f.relPath)).toEqual([]);
  });

  it('15. DTOs are strictly HTTP transport concerns and never imported by domain, application, or infrastructure', () => {
    const nonModuleFiles = allFiles.filter(
      (f) =>
        (f.layer === 'domain' || f.layer === 'application' || f.layer === 'infrastructure' || f.layer === 'ports') &&
        !f.isTest,
    );
    const violations = nonModuleFiles.flatMap((f) =>
      f.imports
        .filter((i) => i.raw.includes('/dto/') || i.resolved.includes('/dto/'))
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('16. HTTP exceptions remain strictly in modules and never leak into domain or application', () => {
    const coreFiles = allFiles.filter(
      (f) => (f.layer === 'domain' || f.layer === 'application' || f.layer === 'ports') && !f.isTest,
    );
    const httpExceptions = [
      'BadRequestException',
      'NotFoundException',
      'ForbiddenException',
      'UnauthorizedException',
      'ConflictException',
      'HttpException',
    ];
    const violations = coreFiles.flatMap((f) => {
      const content = fs.readFileSync(f.filePath, 'utf-8');
      const found = httpExceptions.filter((ex) => new RegExp(`\\b${ex}\\b`).test(content));
      return found.map((ex) => ({ file: f.relPath, exception: ex }));
    });
    expect(violations).toEqual([]);
  });

  // Naming & Structural Governance
  it('17. All application ports MUST use *.port.ts suffix and reside under application/ports/', () => {
    const portFiles = allFiles.filter(
      (f) => f.relPath.startsWith('application/ports/') && !f.isTest && f.relPath !== 'application/ports/index.ts',
    );
    const nonStandard = portFiles.filter((f) => !f.relPath.endsWith('.port.ts'));
    expect(nonStandard.map((f) => f.relPath)).toEqual([]);
  });

  it('18. All application use cases MUST use *.use-case.ts suffix', () => {
    const useCaseFiles = allFiles.filter(
      (f) =>
        f.layer === 'application' &&
        !f.isTest &&
        !f.relPath.startsWith('application/ports/') &&
        f.relPath !== 'application/index.ts' &&
        !f.relPath.endsWith('.types.ts') &&
        !f.relPath.endsWith('.rules.ts'),
    );
    const nonStandard = useCaseFiles.filter((f) => !f.relPath.endsWith('.use-case.ts'));
    expect(nonStandard.map((f) => f.relPath)).toEqual([]);
  });

  it('19. All HTTP DTOs MUST use *.dto.ts suffix and exist only inside src/modules/*/dto/', () => {
    const dtoFiles = allFiles.filter((f) => f.layer === 'dto' && !f.isTest);
    const nonStandard = dtoFiles.filter(
      (f) => !f.relPath.endsWith('.dto.ts') || !f.relPath.includes('/dto/'),
    );
    expect(nonStandard.map((f) => f.relPath)).toEqual([]);
  });

  it('20. All HTTP Mappers MUST use *.mapper.ts suffix and exist only inside src/modules/*/mappers/', () => {
    const mapperFiles = allFiles.filter((f) => f.layer === 'mapper' && !f.isTest);
    const nonStandard = mapperFiles.filter(
      (f) => !f.relPath.endsWith('.mapper.ts') || !f.relPath.includes('/mappers/'),
    );
    expect(nonStandard.map((f) => f.relPath)).toEqual([]);
  });

  it('21. All Controllers MUST use *.controller.ts suffix and exist under src/modules/*/controllers/', () => {
    const controllerFiles = allFiles.filter((f) => f.layer === 'controller' && !f.isTest);
    const nonStandard = controllerFiles.filter(
      (f) => !f.relPath.endsWith('.controller.ts') || !f.relPath.includes('/controllers/'),
    );
    expect(nonStandard.map((f) => f.relPath)).toEqual([]);
  });

  it('22. Infrastructure implementations MUST use explicit role suffixes (.repository.ts, .adapter.ts, .provider.ts)', () => {
    const infraImplFiles = allFiles.filter(
      (f) =>
        f.layer === 'infrastructure' &&
        !f.isTest &&
        f.relPath !== 'infrastructure/postgres/db.ts' &&
        f.relPath !== 'infrastructure/payments/payment-mappers.ts' &&
        !f.relPath.startsWith('infrastructure/config/'),
    );
    const nonStandard = infraImplFiles.filter(
      (f) =>
        !f.relPath.endsWith('.repository.ts') &&
        !f.relPath.endsWith('.adapter.ts') &&
        !f.relPath.endsWith('.provider.ts'),
    );
    expect(nonStandard.map((f) => f.relPath)).toEqual([]);
  });

  it('23. No legacy feature directories or duplicate canonical implementations exist', () => {
    const forbiddenPaths = [
      'features',
      'domain/money',
      'application/collect-rent',
      'application/author-tour',
      'application/owner-listings',
      'application/booking-use-cases',
      'application/me-use-cases',
      'infrastructure/postgres/connection',
    ];

    for (const forbidden of forbiddenPaths) {
      const exists = fs.existsSync(path.join(srcDir, forbidden));
      expect(exists).toBe(false);
    }
  });

  it('24. No duplicate re-export compatibility shims exist', () => {
    const sourceFiles = allFiles.filter((f) => !f.isTest);
    const reexportShims = sourceFiles.flatMap((f) => {
      const content = fs.readFileSync(f.filePath, 'utf-8').trim();
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'));
      const isPureShim =
        lines.length <= 4 &&
        lines.every((l) => l.startsWith('export * from') || l.startsWith('export type * from') || l.startsWith('export {')) &&
        !f.relPath.endsWith('index.ts') &&
        !f.relPath.endsWith('application.ts') &&
        !f.relPath.endsWith('booking.ts') &&
        !f.relPath.endsWith('listing.ts') &&
        !f.relPath.endsWith('payment.ts') &&
        !f.relPath.endsWith('tour.ts') &&
        !f.relPath.endsWith('occupancy.ts') &&
        !f.relPath.endsWith('collection.ts');
      return isPureShim ? [f.relPath] : [];
    });
    expect(reexportShims).toEqual([]);
  });

  it('25. All cross-layer imports use canonical @/* aliases (no fragile ../../)', () => {
    const fragileRelativeCrossLayer: { from: string; importRaw: string }[] = [];

    for (const file of allFiles) {
      for (const imp of file.imports) {
        if (!imp.isExternal) {
          if (imp.raw.startsWith('../../') && !file.isTest) {
            fragileRelativeCrossLayer.push({ from: file.relPath, importRaw: imp.raw });
          }
        }
      }
    }
    expect(fragileRelativeCrossLayer).toEqual([]);
  });

  it('26. No circular dependencies cross architectural boundaries', () => {
    const fileMap = new Map<string, SourceFile>();
    for (const file of allFiles) {
      if (!file.isTest) fileMap.set(file.relPath, file);
    }

    const crossLayerCycles: string[] = [];

    function findCycles(
      startFile: SourceFile,
      currentFile: SourceFile,
      visited: Set<string>,
      trail: string[],
    ) {
      for (const imp of currentFile.imports) {
        if (imp.isExternal) continue;
        const target = fileMap.get(imp.resolved);
        if (!target) continue;

        if (target.relPath === startFile.relPath && trail.length > 1) {
          const trailLayers = trail.map((p) => fileMap.get(p)?.layer);
          const uniqueLayers = new Set([...trailLayers, currentFile.layer]);
          if (uniqueLayers.size > 1) {
            crossLayerCycles.push([...trail, currentFile.relPath, target.relPath].join(' -> '));
          }
          return;
        }

        if (!visited.has(target.relPath)) {
          visited.add(target.relPath);
          findCycles(startFile, target, new Set(visited), [...trail, currentFile.relPath]);
        }
      }
    }

    for (const file of allFiles) {
      if (file.isTest) continue;
      findCycles(file, file, new Set([file.relPath]), []);
    }

    expect(crossLayerCycles).toEqual([]);
  });

  it('27. Composition root is the only layer wiring infrastructure to use cases', () => {
    const nonModuleFiles = allFiles.filter(
      (f) => f.layer !== 'composition' && !f.isTest,
    );
    const violations = nonModuleFiles.flatMap((f) =>
      f.imports
        .filter(
          (i) =>
            !i.isExternal &&
            i.resolvedLayer === 'infrastructure' &&
            (f.layer === 'controller' || f.layer === 'application' || f.layer === 'domain' || f.layer === 'ports'),
        )
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(violations).toEqual([]);
  });

  it('28. External authentication providers remain behind an application-defined identity port', () => {
    const idPort = allFiles.find((f) => f.relPath === 'application/ports/providers/identity-provider.port.ts');
    expect(idPort).toBeDefined();
    const idPortViolations = idPort!.imports.filter(
      (i) => i.raw.includes('supabase') || i.resolved.includes('supabase'),
    );
    expect(idPortViolations).toEqual([]);

    const coreFiles = allFiles.filter(
      (f) => (f.layer === 'domain' || f.layer === 'application' || f.layer === 'ports') && !f.isTest,
    );
    const supabaseInCore = coreFiles.flatMap((f) =>
      f.imports
        .filter((i) => i.raw.includes('supabase') || i.resolved.includes('supabase'))
        .map((i) => ({ file: f.relPath, import: i.raw })),
    );
    expect(supabaseInCore).toEqual([]);

    const supabaseAdapter = allFiles.find(
      (f) => f.relPath === 'infrastructure/supabase/jwks-identity.provider.ts',
    );
    expect(supabaseAdapter).toBeDefined();
    const implementsPort = supabaseAdapter!.imports.some((i) =>
      i.resolved.includes('identity-provider'),
    );
    expect(implementsPort).toBe(true);
  });
});
