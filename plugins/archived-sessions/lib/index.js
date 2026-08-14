import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

const instanceInitializers = []

export async function restoreArchivedSession(registry, sessionId) {
  return registry.enqueueOperation(async () => {
    const state = registry.requireState()
    const restored = state.archivedSessionIds.includes(sessionId)

    if (!restored) {
      return { restored, archivedSessionIds: [...state.archivedSessionIds] }
    }

    const archivedSessionIds = state.archivedSessionIds.filter((id) => id !== sessionId)
    await registry.setState({ ...state, archivedSessionIds })
    return { restored, archivedSessionIds }
  })
}

/** Host Remote that performs the durable half of restoring an archived session. */
export class ArchivedSessionsGateway extends TypertRemoteService {
  static inject = ['workspaceRegistry']

  constructor(ctx) {
    super(ctx, 'archivedSessions')
    for (const initialize of instanceInitializers) initialize.call(this)
  }

  async restore(sessionId) {
    return restoreArchivedSession(this.ctx.workspaceRegistry, sessionId)
  }
}

Remote('restore')(ArchivedSessionsGateway.prototype.restore, {
  kind: 'method',
  name: 'restore',
  static: false,
  private: false,
  addInitializer(initialize) {
    instanceInitializers.push(initialize)
  },
})

export default ArchivedSessionsGateway
