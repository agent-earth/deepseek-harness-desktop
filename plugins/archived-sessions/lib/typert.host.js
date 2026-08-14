import { z } from 'zod'

const sessionIdSchema = z.string().min(1)
const restoreResultSchema = z.object({
  restored: z.boolean(),
  archivedSessionIds: z.array(z.string()),
})

export const TYPERT = {
  package: '@deepseek-harness-desktop/client-ui-archived-sessions',
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: '@deepseek-harness-desktop/client-ui-archived-sessions#archivedSessions/restore',
      service: 'archivedSessions',
      namespace: 'archivedSessions',
      method: 'restore',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'sessionId',
          wire: 'sessionId',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: '@deepseek-harness-desktop/client-ui-archived-sessions/types#SessionId',
            schema: sessionIdSchema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@deepseek-harness-desktop/client-ui-archived-sessions/types#RestoreResult',
        schema: restoreResultSchema,
      },
    },
  ],
  model: {
    services: [],
    events: [],
    objects: [],
  },
}

export default TYPERT
