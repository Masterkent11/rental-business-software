import tseslint from 'typescript-eslint';

/**
 * The layer boundary, enforced.
 *
 * P-01 and ADR-0012 both say the domain and application layers import nothing
 * from a framework, a driver, or a platform SDK. A rule enforced only by review
 * is a rule that has already been broken somewhere, so it is a lint error here.
 */
const forbidden = (layer, patterns) => ({
  files: [`src/${layer}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: patterns.map((group) => ({
          group: [group.pattern],
          message: group.message,
        })),
      },
    ],
  },
});

const frameworkAndInfra = [
  {
    pattern: '@nestjs/*',
    message:
      'NestJS may not reach this layer (ADR-0012). Decorators belong in ' +
      'src/modules (presentation) and src/infrastructure. Wire use cases with ' +
      'useFactory instead.',
  },
  {
    pattern: '@supabase/*',
    message:
      'Supabase is an infrastructure choice, not a foundation (ADR-0001). ' +
      'Reach it through a port implemented in src/infrastructure.',
  },
  { pattern: 'postgres', message: 'SQL drivers belong in src/infrastructure.' },
  { pattern: 'drizzle-orm*', message: 'ORMs belong in src/infrastructure.' },
  {
    pattern: '**/infrastructure/**',
    message:
      'Dependencies point inward. This layer defines ports; infrastructure ' +
      'implements them.',
  },
];

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**'] },
  ...tseslint.configs.recommended,
  forbidden('domain', [
    ...frameworkAndInfra,
    {
      pattern: '**/application/**',
      message: 'The domain is the innermost layer. It imports nothing of ours.',
    },
    { pattern: 'zod', message: 'Validation happens at the edge, not in the domain.' },
  ]),
  forbidden('application', frameworkAndInfra),
  forbidden('features', frameworkAndInfra),
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
