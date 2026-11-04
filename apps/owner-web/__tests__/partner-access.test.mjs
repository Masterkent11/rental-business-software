import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationProblems, safePartnerReturn, partnerRole } from '../domain/session/partner-access.ts';
import { loadSource } from './helpers/load-store.mjs';
const { RegisterPartnerUseCase, CompletePartnerSetupUseCase } = loadSource('application/use-cases/session/partner-access.use-cases.ts');

test('registration rejects invalid fields before contacting the provider', async () => {
  let calls = 0;
  const register = new RegisterPartnerUseCase({ register: async () => { calls++; return { confirmationRequired: true }; } });
  await assert.rejects(register.execute({ fullName: 'A', email: 'bad', password: '123' }));
  assert.equal(calls, 0);
  assert.deepEqual(Object.keys(registrationProblems({ fullName: '', email: '', password: '' })), ['fullName', 'email', 'password']);
  assert.deepEqual(await register.execute({ fullName: ' Ana ', email: ' ana@example.test ', password: 'long-test-password' }), { confirmationRequired: true });
});
test('unsafe external return destinations never reach navigation', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/sign-in', '/auth/callback', '/onboarding/setup', '/\n/evil']) assert.equal(safePartnerReturn(value), '/');
  assert.equal(safePartnerReturn('/properties/123?tab=details'), '/properties/123?tab=details');
  assert.equal(safePartnerReturn('/agent/leads'), '/agent/leads');
});
test('only owner and agent intent is accepted', () => {
  assert.equal(partnerRole('OWNER'), 'OWNER');
  assert.equal(partnerRole('AGENT'), 'AGENT');
  assert.equal(partnerRole('PLATFORM_ADMIN'), null);
});
test('workspace setup validates its role-specific data before writing', async () => {
  const complete = new CompletePartnerSetupUseCase({ completeSetup: async input => input.role });
  await assert.rejects(complete.execute({ role: 'OWNER', workspaceName: ' ', displayName: 'Ana', headline: '', area: '' }));
  await assert.rejects(complete.execute({ role: 'AGENT', workspaceName: '', displayName: '', headline: '', area: '' }));
  assert.equal(await complete.execute({ role: 'OWNER', workspaceName: 'Ana Homes', displayName: 'Ana', headline: '', area: '' }), 'OWNER');
});
