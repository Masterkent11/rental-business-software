import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * One test file at a time.
     *
     * The integration suites share one database, which makes it a shared
     * fixture: run in parallel, the payments suite's reset cancels holds the
     * occupancy suite is mid-way through asserting on, and both fail in ways
     * that look like real bugs.
     *
     * The unit suites would be safe in parallel, but splitting the run into
     * two configurations to save a couple of seconds is a worse trade than
     * a suite that is always trustworthy.
     */
    fileParallelism: false,

    /**
     * Hooks get the same room as tests.
     *
     * `describe(name, { timeout })` covers tests only, so an integration
     * suite's setup against a remote database hit vitest's 10s hook default
     * and reported "Hook timed out" — which reads like a deadlock rather than
     * the latency it was.
     */
    hookTimeout: 30_000,
  },
});
