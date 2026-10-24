import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExtensionLoadScheduler } from '~/utils/extension-load-scheduler'
import type { ExtensionWarmContext, ExtensionWarmTask } from '~/types/extension-loading'

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

describe('extension load scheduler', () => {
  let idle: (() => void)[]
  let scheduler: ReturnType<typeof createExtensionLoadScheduler>
  const job = (key: string, run: ExtensionWarmTask['run'] = vi.fn(async () => {})): ExtensionWarmTask => ({ key, run })
  const tick = async () => { idle.shift()?.(); await flush() }

  beforeEach(() => {
    idle = []
    scheduler = createExtensionLoadScheduler({
      schedule: callback => {
        idle.push(callback)
        return () => { idle = idle.filter(item => item !== callback) }
      },
    })
  })
  afterEach(() => scheduler.dispose())

  it('waits for shell readiness and an idle turn, then warms one page at a time', async () => {
    const first = job('first')
    const second = job('second')
    scheduler.setCandidates([first, second])
    expect(idle).toHaveLength(0)
    scheduler.setReady(true)
    expect(first.run).not.toHaveBeenCalled()
    await tick()
    expect(first.run).toHaveBeenCalledOnce()
    expect(second.run).not.toHaveBeenCalled()
    await tick()
    expect(second.run).toHaveBeenCalledOnce()
    expect(idle).toHaveLength(0)
  })

  it('pauses queued work for foreground loads and prioritizes stable intent', async () => {
    const first = job('first')
    const target = job('target')
    scheduler.setReady(true)
    scheduler.setCandidates([first, target])
    const end = scheduler.beginForeground('current')
    const intent = scheduler.prefetch(target)
    expect(idle).toHaveLength(0)
    expect(target.run).not.toHaveBeenCalled()
    end()
    await tick()
    await intent
    expect(target.run).toHaveBeenCalledOnce()
    expect(first.run).not.toHaveBeenCalled()
    await tick()
    expect(first.run).toHaveBeenCalledOnce()
  })

  it('promotes an already-running target without starting another task', async () => {
    let resume!: () => void
    const target = job('target', vi.fn(async (context: ExtensionWarmContext) => {
      await new Promise<void>(resolve => { resume = resolve })
      await context.checkpoint()
    }))
    scheduler.setReady(true)
    const pending = scheduler.prefetch(target)
    await tick()
    const end = scheduler.beginForeground('target')
    resume()
    await flush()
    await pending
    expect(target.run).toHaveBeenCalledOnce()
    end()
  })

  it('yields at stage boundaries while an unrelated foreground page loads', async () => {
    let resume!: () => void
    const finished = vi.fn()
    scheduler.setReady(true)
    const pending = scheduler.prefetch(job('other', vi.fn(async (context: ExtensionWarmContext) => {
      await new Promise<void>(resolve => { resume = resolve })
      await context.checkpoint()
      finished()
    })))
    await tick()
    const end = scheduler.beginForeground('current')
    resume()
    await flush()
    expect(finished).not.toHaveBeenCalled()
    expect(idle).toHaveLength(0)
    end()
    await tick()
    await pending
    expect(finished).toHaveBeenCalledOnce()
  })

  it('deduplicates intent and background candidates', async () => {
    const target = job('target')
    scheduler.setReady(true)
    scheduler.setCandidates([target, target])
    const first = scheduler.prefetch(target)
    const second = scheduler.prefetch(target)
    await tick()
    await Promise.all([first, second])
    scheduler.setCandidates([target])
    expect(target.run).toHaveBeenCalledOnce()
    expect(idle).toHaveLength(0)
  })

  it('resumes after visibility or connectivity allows speculative work', async () => {
    const target = job('target')
    scheduler.setReady(true)
    scheduler.setEnabled(false)
    scheduler.setCandidates([target])
    expect(idle).toHaveLength(0)
    scheduler.setEnabled(true)
    await tick()
    expect(target.run).toHaveBeenCalledOnce()
  })

  it('drops stale stages after invalidation and allows a fresh attempt', async () => {
    let resume!: () => void
    const publish = vi.fn()
    const target = job('target', vi.fn(async (context: ExtensionWarmContext) => {
      await new Promise<void>(resolve => { resume = resolve })
      await context.checkpoint()
      publish()
    }))
    scheduler.setReady(true)
    const pending = scheduler.prefetch(target)
    await tick()
    scheduler.invalidate()
    resume()
    await flush()
    await pending
    expect(publish).not.toHaveBeenCalled()
    const fresh = job('target')
    scheduler.setCandidates([fresh])
    await tick()
    expect(fresh.run).toHaveBeenCalledOnce()
  })

  it('isolates speculative failures and never loops retrying the same candidate', async () => {
    const broken = job('broken', vi.fn(async () => { throw new Error('denied') }))
    const next = job('next')
    scheduler.setReady(true)
    scheduler.setCandidates([broken, next])
    await tick()
    await tick()
    scheduler.setCandidates([broken, next])
    expect(broken.run).toHaveBeenCalledOnce()
    expect(next.run).toHaveBeenCalledOnce()
    expect(idle).toHaveLength(0)
  })

  it('removes obsolete candidates before they can execute', async () => {
    const denied = job('denied')
    const allowed = job('allowed')
    scheduler.setReady(true)
    scheduler.setCandidates([denied])
    scheduler.setCandidates([allowed])
    await tick()
    expect(denied.run).not.toHaveBeenCalled()
    expect(allowed.run).toHaveBeenCalledOnce()
  })

  it('eventually prepares every candidate without a count limit', async () => {
    const tasks = Array.from({ length: 125 }, (_, index) => job(`page-${index}`))
    scheduler.setReady(true)
    scheduler.setCandidates(tasks)
    for (let i = 0; i < tasks.length; i++) await tick()
    for (const task of tasks) expect(task.run).toHaveBeenCalledOnce()
    expect(idle).toHaveLength(0)
  })

  it('settles pending checkpoints and cancels scheduled work when disposed', async () => {
    const publish = vi.fn()
    scheduler.setReady(true)
    const pending = scheduler.prefetch(job('target', vi.fn(async (context: ExtensionWarmContext) => {
      await context.checkpoint()
      publish()
    })))
    await tick()
    scheduler.dispose()
    await pending
    expect(publish).not.toHaveBeenCalled()
    expect(idle).toHaveLength(0)
  })
})
