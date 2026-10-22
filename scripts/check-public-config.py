#!/usr/bin/env python3
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
allowed = {'APP_ENV', 'API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'}
failures = []
for file in (root / 'apps/customer_app/config').glob('*.example.json'):
    values = json.loads(file.read_text())
    if set(values) != allowed:
        failures.append(str(file.relative_to(root)) + ': unexpected or missing configuration names')
    if any(not isinstance(value, str) for value in values.values()):
        failures.append(str(file.relative_to(root)) + ': non-string configuration value')
files = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
for name in set(files):
    if not name or not (name.startswith(('docs/postman/', 'docs/api/')) or re.match(r'apps/customer_app/(config/|lib/)', name)):
        continue
    file = root / name
    if not file.is_file():
        continue
    text = file.read_text()
    for match in re.finditer(r'sb_secret_[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', text):
        failures.append(f'{name}:{text.count(chr(10), 0, match.start()) + 1}: private credential signature')
    for match in re.finditer(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', text):
        import base64
        try:
            payload = match.group().split('.')[1]
            role = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4))).get('role')
            if role == 'service_role':
                failures.append(f'{name}: service-role JWT')
        except (ValueError, UnicodeDecodeError):
            pass
if failures:
    raise SystemExit('\n'.join(failures))
print('Public config/artifact credential-pattern checks passed (not a full repository secret scan).')
