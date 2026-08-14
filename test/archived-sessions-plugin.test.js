import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'
import { restoreArchivedSession } from '../plugins/archived-sessions/lib/index.js'
import { TYPERT } from '../plugins/archived-sessions/lib/typert.host.js'
import { TYPERT_REMOTE } from '../plugins/archived-sessions/lib/typert.remote-client.js'

const clientUrl = new URL('../plugins/archived-sessions/lib/client.js', import.meta.url)
const patchUrl = new URL('../plugins/archived-sessions/cordis.patch.yml', import.meta.url)

test('desktop profile mounts the archived sessions settings plugin', async () => {
  const patch = await readFile(patchUrl, 'utf8')

  assert.match(patch, /id:\s*ui-archived-sessions/)
  assert.match(patch, /@deepseek-harness-desktop\/client-ui-archived-sessions/)
})

test('archived sessions page mounts the restore Remote and exposes an unarchive action', async () => {
  const client = await readFile(clientUrl, 'utf8')

  assert.match(client, /archivedSessionIds/)
  assert.match(client, /id:\s*'archived-sessions'/)
  assert.match(client, /cancel:\s*'取消'/)
  assert.match(client, /ctx\.remote\.archivedSessions\.restore\(sessionId\)/)
  assert.match(client, /ctx\.remote\.\$mount\(TYPERT_REMOTE\)/)
  assert.match(client, /ctx\.inject\([\s\S]*'remote\.archivedSessions'/)
  assert.doesNotMatch(client, /尚未提供公开的恢复归档 API/)
  assert.doesNotMatch(client, /\.archiveSession\s*\(/)
})

test('host and client publish matching strict restore descriptors', () => {
  const host = TYPERT.invocations[0]
  const client = TYPERT_REMOTE.descriptors[0]

  assert.equal(host.id, client.id)
  assert.equal(host.service, 'archivedSessions')
  assert.equal(host.namespace, client.namespace)
  assert.equal(host.method, 'restore')
  assert.equal(host.parameters[0].wire, 'sessionId')
  assert.equal(host.parameters[0].codec.mode, 'strict')
  assert.equal(client.result.mode, 'strict')
})

test('pinned Harness exposes the workspace state hooks used by restore', () => {
  assert.equal(typeof WorkspaceRegistry.prototype.requireState, 'function')
  assert.equal(typeof WorkspaceRegistry.prototype.setState, 'function')
  assert.equal(typeof WorkspaceRegistry.prototype.enqueueOperation, 'function')
})

test('restore removes only the requested archived session and preserves registry state', async () => {
  const initial = {
    initialized: true,
    workspaceIds: ['workspace-1'],
    archivedSessionIds: ['session-1', 'session-2'],
  }
  let state = initial
  let writes = 0
  const registry = {
    requireState: () => state,
    setState: async (next) => {
      writes += 1
      state = next
    },
    enqueueOperation: (operation) => operation(),
  }

  const result = await restoreArchivedSession(registry, 'session-1')

  assert.deepEqual(result, { restored: true, archivedSessionIds: ['session-2'] })
  assert.deepEqual(state, {
    initialized: true,
    workspaceIds: ['workspace-1'],
    archivedSessionIds: ['session-2'],
  })
  assert.equal(writes, 1)
  assert.deepEqual(initial.archivedSessionIds, ['session-1', 'session-2'])
})

test('restore is idempotent when the session is not archived', async () => {
  const state = { initialized: true, workspaceIds: [], archivedSessionIds: ['session-2'] }
  let writes = 0
  const registry = {
    requireState: () => state,
    setState: async () => { writes += 1 },
    enqueueOperation: (operation) => operation(),
  }

  const result = await restoreArchivedSession(registry, 'session-1')

  assert.deepEqual(result, { restored: false, archivedSessionIds: ['session-2'] })
  assert.equal(writes, 0)
})
