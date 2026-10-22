import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './helpers/load-store.mjs';
import * as fixture from './fixtures/owner-dashboard.mjs';

const scope={kind:'OWNER',organizationId:fixture.org};

test('collection orchestration preserves authoritative centavos and rejects missing organization', async () => {
  const {LoadDashboardUseCase}=loadSource('application/use-cases/dashboard/load-dashboard.use-case.ts');
  const calls=[];
  const useCase=new LoadDashboardUseCase({getCollection:async org=>{calls.push(org);return fixture.collection;}});
  await assert.rejects(useCase.execute(''),/Organization ID/);
  assert.equal(await useCase.execute(fixture.org),fixture.collection);
  assert.deepEqual(calls,[fixture.org]);
});

test('engagement commands keep transition and validation decisions in existing use cases', async () => {
  const {MoveInquiryUseCase,ViewingActionUseCase}=loadSource('application/use-cases/partner/engagement.use-cases.ts');
  const calls=[];
  const repository={updateInquiryStatus:async(...args)=>{calls.push(args);return {id:'lead'};},viewingAction:async(...args)=>{calls.push(args);return fixture.viewings[0];}};
  const move=new MoveInquiryUseCase(repository);
  assert.throws(()=>move.execute(scope,{id:'lead',status:'CLOSED'},'NEW',null),/not available/);
  await move.execute(scope,{id:'lead',status:'NEW'},'CONTACTED','discarded reason');
  assert.deepEqual(calls[0],[scope,'lead','CONTACTED',null]);
  const view=new ViewingActionUseCase(repository);
  assert.throws(()=>view.execute(scope,'viewing',{action:'CONFIRM',scheduledAt:null}),/exact viewing time/);
  await view.execute(scope,'viewing',{action:'CONFIRM',scheduledAt:'2026-10-28T01:00:00Z',note:'  confirmed  '});
  assert.equal(calls[1][2].note,'confirmed');
});

test('booking status commands preserve the organization and delegate authoritative decisions', async () => {
  const {UpdateBookingStatusUseCase}=loadSource('application/use-cases/bookings/bookings.use-cases.ts');
  let received;
  const useCase=new UpdateBookingStatusUseCase({updateBookingStatus:async(...args)=>{received=args;return fixture.booking;}});
  await assert.rejects(useCase.execute('',fixture.bookingId,'COMPLETE'),/Organization ID/);
  assert.equal(await useCase.execute(fixture.org,fixture.bookingId,'COMPLETE'),fixture.booking);
  assert.deepEqual(received,[fixture.org,fixture.bookingId,'COMPLETE']);
});
