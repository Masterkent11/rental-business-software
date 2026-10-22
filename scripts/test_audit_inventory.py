import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('audit_inventory', Path(__file__).with_name('audit-inventory.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AuditInventoryTests(unittest.TestCase):
    def test_captures_typescript_and_dart_dependency_syntax(self):
        dependencies, symbols = audit.source_metadata('''
import type { Invoice } from '@/domain/collection/collection.ts';
import {
  Controller,
} from '@nestjs/common';
export { item } from './item';
const adapter = require('./adapter');
import 'package:flutter/material.dart';
class InvoiceController {}
interface Repository {}
function allocate() {}
''')
        self.assertEqual(dependencies, [
            '@/domain/collection/collection.ts', '@nestjs/common', './item',
            './adapter', 'package:flutter/material.dart',
        ])
        self.assertTrue({'InvoiceController', 'Repository', 'allocate'}.issubset(symbols))

    def test_real_sources_do_not_silently_have_empty_dependency_lists(self):
        root = Path(__file__).resolve().parents[1]
        dependencies, _ = audit.source_metadata((root / 'apps/api/src/domain/collection/collection-rules.ts').read_text())
        self.assertIn('@/domain/shared/money.ts', dependencies)
        dependencies, _ = audit.source_metadata((root / 'apps/customer_app/lib/features/explore/application/explore_results.dart').read_text())
        self.assertIn('package:flutter_riverpod/flutter_riverpod.dart', dependencies)


if __name__ == '__main__':
    unittest.main()
