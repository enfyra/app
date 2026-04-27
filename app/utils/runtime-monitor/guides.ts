import type { RuntimeGuide } from '~/types/runtime-monitor';

export const runtimeTabGuides: Record<string, RuntimeGuide> = {
  overview: {
    title: 'Overview Guide',
    description: 'These numbers describe the health of each live server instance at the sampled time.',
    groups: [
      {
        title: 'Instance And Time',
        items: [
          ['Instances', 'How many server processes have sent runtime samples to this admin session. In PM2 cluster mode this should match the live instance count.'],
          ['Sampled at', 'The exact server timestamp when the snapshot was measured. If this is old, the admin socket is stale or the instance stopped emitting.'],
          ['Avg since boot', 'Average from this process boot until now. The counters are stored in Redis and reset when that process starts again.'],
          ['PID / Uptime', 'Use PID to match PM2 or OS logs. Uptime tells whether the process has restarted recently.'],
          ['Cluster active', 'Active instance count detected from the same Redis heartbeat set used by SQL pool coordination. This is the source of truth for server process count.'],
          ['Heartbeat age', 'How old each instance heartbeat is. Near the stale threshold means the process may be unhealthy or shutting down.'],
        ],
      },
      {
        title: 'Memory And Event Loop',
        items: [
          ['RSS', 'Total RAM currently held by the process, including Node.js, native modules, buffers, isolated-vm, and child/runtime overhead.'],
          ['Heap', 'Main Node.js JavaScript heap used / committed. High used compared with the V8 limit is a leak or retained object warning.'],
          ['Isolate heap', 'Highest live heap pressure from dynamic script isolates. High values mean user/runtime code is close to isolate memory limits.'],
          ['Event loop', 'Main-thread scheduling delay. Sustained high delay means the process is busy or blocked, even if CPU/RAM still look acceptable.'],
        ],
      },
      {
        title: 'Hardware / Tuning',
        items: [
          ['RAM / CPU', 'Effective resources detected by Enfyra for auto-tuning. If host and effective differ, the process is running under container/cgroup limits.'],
          ['Workers', 'Executor worker capacity selected from effective CPU and memory. This is capacity, not current request count.'],
          ['Task cap', 'Maximum concurrent executor tasks per worker. Waiting tasks mean demand is above this capacity at that moment.'],
          ['Warm isolates', 'Prepared isolated-vm contexts kept ready per worker to reduce cold execution overhead.'],
          ['SQL target pool', 'Total SQL pool max assigned per process after Enfyra reserves DB connections and divides capacity across active instances.'],
        ],
      },
    ],
  },
  workers: {
    title: 'Workers Guide',
    description: 'These numbers explain how the executor engine is using workers and reusable isolated contexts.',
    groups: [
      {
        title: 'Executor Load',
        items: [
          ['Workers', 'Running executor workers / configured capacity. Fewer running workers than capacity means workers are still booting, draining, or crashed.'],
          ['Active now', 'Executor tasks currently running at the sample instant. Zero is normal when no script/flow/hook is executing.'],
          ['Waiting', 'Executor tasks queued because all worker slots are busy. Sustained waiting means the executor is saturated.'],
          ['Task p95 / p99', 'Slow-tail execution latency. High p99 with low waiting usually points to slow user logic; high p99 with waiting points to saturation.'],
          ['Errors', 'Task errors / timeouts since process start. Any timeout deserves inspection because it can hold slots longer than expected.'],
        ],
      },
      {
        title: 'Context Reuse',
        items: [
          ['Active', 'Reusable isolated contexts currently checked out by running tasks.'],
          ['Idle', 'Prepared contexts available for immediate reuse. Idle above zero means the pool is warm.'],
          ['Created', 'Contexts created since worker boot. Fast growth under steady traffic means reuse is not keeping up.'],
          ['Reused', 'Successful context reuses. This should grow under normal load and confirms the pool is reducing cold-start overhead.'],
          ['Scrub failed', 'Context cleanup failed before reuse. Any non-zero value is dangerous because isolation guarantees may be compromised.'],
        ],
      },
    ],
  },
  requests: {
    title: 'Requests Guide',
    description: 'These numbers show API pressure and slow/erroring routes across live instances.',
    groups: [
      {
        title: 'Route Latency',
        items: [
          ['RPS', 'Average requests per second since each process booted, aggregated across live samples.'],
          ['p50 / p95 / p99', 'Latency percentiles. p50 is normal traffic; p95/p99 show tail latency that users usually feel during incidents.'],
          ['4xx / 5xx', 'Client and server error counts. 5xx means backend failures; rising 4xx can mean auth, validation, or client integration issues.'],
        ],
      },
    ],
  },
  cache: {
    title: 'Cache Guide',
    description: 'These rows show recent metadata/cache reload chains and where they spent time or failed.',
    groups: [
      {
        title: 'Reload Health',
        items: [
          ['Flow', 'The dominant reload area, such as metadata, route, graphql, or all.'],
          ['Steps', 'Each cache step run during the reload, with per-step duration and failures.'],
          ['Instance', 'The server process that recorded this reload. In multi-instance mode, remote invalidations should appear per receiving instance.'],
          ['Failed step', 'A failed reload can leave runtime caches stale; inspect the step name before debugging endpoint symptoms.'],
        ],
      },
    ],
  },
  database: {
    title: 'Database Guide',
    description: 'These metrics show QueryBuilder pressure, slow operations, and DB/query errors.',
    groups: [
      {
        title: 'Query Path',
        items: [
          ['Context', 'Where the query was executed: runtime request, cache reload, data migration, flow, boot, or system code.'],
          ['Operation', 'QueryBuilder operation such as find, insert, update, delete, or raw.'],
          ['Slow', 'Count of operations slower than the server threshold. Slow query count plus DB pool pending usually means the DB path is the bottleneck.'],
          ['Errors', 'Query errors captured at the QueryBuilder boundary.'],
          ['Pool timeout', 'Queries that failed while waiting for a DB connection from the pool.'],
          ['p95 / p99', 'Slow-tail query latency per table/operation.'],
        ],
      },
    ],
  },
  flows: {
    title: 'Flows Guide',
    description: 'These metrics show flow execution health and problematic steps.',
    groups: [
      {
        title: 'Execution Health',
        items: [
          ['Running', 'Flow executions currently running in workers.'],
          ['Completed / failed', 'Execution outcomes since process boot.'],
          ['p95', 'Slow-tail total flow duration.'],
          ['Failed steps', 'Step keys that failed most often. These are usually the first place to inspect.'],
          ['Slow steps', 'Step keys with highest p95 duration.'],
        ],
      },
    ],
  },
  connections: {
    title: 'Connections Guide',
    description: 'These numbers separate live sockets, async queues, and database pool pressure.',
    groups: [
      {
        title: 'WebSocket',
        items: [
          ['Connected', 'Live Socket.IO connections attached to this process and namespace. This is not a queue count.'],
          ['Users', 'Distinct authenticated user ids currently seen in that namespace on this process.'],
          ['Multi-instance', 'Each process reports its own local socket count; the summary is built by receiving samples from all live instances through the Redis Socket.IO adapter.'],
        ],
      },
      {
        title: 'Queues',
        items: [
          ['websocketConnection', 'Queued websocket connection handler jobs, not current connected sockets.'],
          ['websocketEvent', 'Queued websocket event handler jobs, not emitted websocket messages.'],
          ['failed', 'Retained failed jobs. A failed count can stay visible after the original incident until queue retention removes it.'],
        ],
      },
      {
        title: 'DB Pool',
        items: [
          ['Used', 'Connections currently checked out by queries or transactions.'],
          ['Available', 'Pool capacity that can still be assigned before requests wait. This is max minus used and pending.'],
          ['Idle', 'Already-created DB connections sitting idle inside the pool. This can be lower than available after boot and is not a capacity error.'],
          ['Pending', 'Requests waiting for a DB connection. Any sustained pending count means DB pool capacity or query duration is the bottleneck.'],
        ],
      },
    ],
  },
};
