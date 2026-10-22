#!/usr/bin/env python3
"""Inventory first-party text without equating static scans to human review."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE = {'node_modules', '.next', 'build', '.dart_tool', 'Pods', '.symlinks', 'ephemeral', '.git', 'dist', '.gradle'}
EXTENSIONS = {'.dart', '.ts', '.tsx', '.js', '.mjs', '.mts', '.json', '.yaml', '.yml', '.sql', '.sh', '.py', '.rb', '.gradle', '.kts', '.kt', '.swift', '.plist', '.xcconfig', '.xcscheme', '.pbxproj', '.toml', '.md', '.css', '.html', '.xml', '.h', '.cpp', '.c', '.properties', '.cmake', '.entitlements', '.xcworkspacedata', '.xctestplan', '.xcsettings', '.xcprivacy'}
GENERATED = {'postman-v2.1.schema.json', 'package-lock.json', 'pubspec.lock', 'Podfile.lock', 'Generated.xcconfig', 'flutter_export_environment.sh', 'next-env.d.ts', 'generated_plugin_registrant.dart', 'generated_plugin_registrant.cc', 'generated_plugin_registrant.h', 'generated_plugins.cmake', 'GeneratedPluginRegistrant.m', 'GeneratedPluginRegistrant.h', 'GeneratedPluginRegistrant.swift'}
def source_metadata(content):
    dependencies = re.findall(r'''(?:from\s+|import\s+|require\()['"]([^'"\n]+)''', content)
    symbols = re.findall(r'(?:class|function|interface|enum|type)\s+(\w+)', content)
    return dependencies, symbols


def main():
    paths = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    review_path = ROOT / 'docs/architecture-audit/reviewed-files.json'
    reviews = json.loads(review_path.read_text()) if review_path.exists() else {}
    records = []
    for name in sorted(set(paths)):
        p = Path(name)
        if not name or not (name in {'README.md', 'DEMO.md', 'LAUNCH_READINESS.md', '.gitignore'} or any(name.startswith(prefix) for prefix in ('apps/customer_app/', 'apps/api/', 'apps/owner-web/', 'supabase/', 'docs/', '.github/', 'scripts/'))):
            continue
        if any(part in EXCLUDE for part in p.parts) or p.name in GENERATED or '/assets/' in name or '/public/' in name:
            continue
        if name.startswith(('docs/architecture-audit/', 'docs/postman/', 'docs/api/')) or p.name.startswith('.env') and not p.name.endswith('.example'):
            continue
        if p.suffix not in EXTENSIONS and p.name not in {'Podfile', 'Dockerfile', '.gitignore', '.env.example', 'AGENTS.md', 'CMakeLists.txt', '.metadata'}:
            continue
        content = (ROOT / p).read_text()
        layer = next((l for l in ['domain', 'application', 'infrastructure'] if f'/{l}/' in name), None)
        if name.startswith('apps/customer_app/lib/features/application/') and '/domain/' not in name: layer = 'presentation/composition'
        layer = layer or ('presentation/composition' if any(f'/{l}/' in name for l in ['features', 'app', 'components', 'stores', 'design', 'modules']) else 'infrastructure' if '/data/' in name else 'configuration/documentation')
        if '/test/' in name or '/__tests__/' in name or '.test.' in name: layer = 'test'
        imports, symbols = source_metadata(content)
        candidates = []
        if layer == 'domain' and any(re.search(r'flutter|react|next|nestjs|supabase|postgres|infrastructure|application/', i) for i in imports):
            candidates.append('Domain import boundary requires review')
        if layer == 'application' and any(re.search(r'flutter/material|react|next/|nestjs|supabase|postgres|infrastructure|modules/|/data/|/fixtures/', i) for i in imports):
            candidates.append('Application import boundary requires review')
        digest = hashlib.sha256(content.encode()).hexdigest()
        review = reviews.get(name)
        inspected = review is not None and review.get('sha256') == digest
        records.append({'path':name, 'application':p.parts[1] if p.parts[0]=='apps' else p.parts[0], 'layer':layer, 'sha256':digest,
          'lines':len(content.splitlines()), 'imports':imports, 'symbols':symbols, 'staticCandidates':candidates,
          'inspection':'Reviewed' if inspected else 'Static scan only; detailed review pending',
          'findings':review.get('findings',[]) if inspected else [], 'highestSeverity':review.get('severity','None') if inspected else 'Not assessed',
          'refactorRequired':review.get('refactor','No') if inspected else 'Not assessed',
          'testCoverage':review.get('tests','Not mapped') if inspected else 'Not mapped'})
    folder = ROOT / 'docs/architecture-audit'
    folder.mkdir(exist_ok=True, parents=True)
    (folder/'file-inventory.json').write_text(json.dumps(records,indent=2)+'\n')
    reviewed = sum(r['inspection']=='Reviewed' for r in records)
    lines = ['# File inspection ledger', '', f'Eligible: {len(records)}. Detailed content reviews: {reviewed}. Coverage: {reviewed/len(records)*100:.2f}%. Every eligible file was read by the inventory scanner; static scanning is explicitly **not** a complete architecture/security review.', '', 'Scope includes first-party source, tests, configuration, migrations, and documentation in the three requested applications, Supabase, root docs/scripts/CI. Excludes dependencies/build outputs, lockfile contents, generated registrants/config, and asset packs. Dependency manifests and authored native build setup are included. reviewed-files.json binds detailed reviews to content hashes; edits invalidate reviews until renewed.', '', '| Path | Application | Layer | Inspection | Findings | Severity | Refactor required | Tests |', '|---|---|---|---|---:|---|---|---|']
    for r in records:
        lines.append(f"| {r['path']} | {r['application']} | {r['layer']} | {r['inspection']} | {len(r['findings']) if r['inspection']=='Reviewed' else 'Unknown'} | {r['highestSeverity']} | {r['refactorRequired']} | {r['testCoverage']} |")
    (folder/'01-file-inventory.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'eligible':len(records),'reviewed':reviewed,'coverage':round(reviewed/len(records)*100,2),'boundaryCandidates':[{ 'path':r['path'],'candidates':r['staticCandidates']} for r in records if r['staticCandidates']]}))


if __name__ == "__main__":
    main()
