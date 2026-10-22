import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './helpers/load-store.mjs';

process.env.NEXT_PUBLIC_API_BASE_URL='http://localhost:8080';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://synthetic.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic';

test('HTTP timeout and caller cancellation are distinct from offline failures',async(t)=>{
  const realFetch=globalThis.fetch;
  const realTimeout=AbortSignal.timeout;
  t.after(()=>{globalThis.fetch=realFetch;AbortSignal.timeout=realTimeout;});
  const {HttpClient}=loadSource('infrastructure/http/http-client.ts');
  const client=new HttpClient();
  AbortSignal.timeout=(duration)=>{assert.equal(duration,20_000);return realTimeout(10);};
  globalThis.fetch=async(_url,{signal})=>new Promise((_,reject)=>{
    if(signal.aborted)reject(signal.reason);
    else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
  });
  const keepAlive=setTimeout(()=>{},1000);t.after(()=>clearTimeout(keepAlive));
  await assert.rejects(client.request('/health'),error=>error.code==='TIMEOUT');
  const cancelled=new AbortController();cancelled.abort();
  await assert.rejects(client.request('/health',{signal:cancelled.signal}),error=>error.code==='CANCELLED');
  globalThis.fetch=async()=>{throw new TypeError('Offline');};
  await assert.rejects(client.request('/health'),error=>error.code==='NETWORK');
});
