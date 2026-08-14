window.__ModuleLoader__.load({
  id: '@deepseek-harness-desktop/client-ui-archived-sessions',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const { Fragment, jsx, jsxs } = require('react/jsx-runtime')
    const { useMemo, useState } = require('react')
    const { Button, Modal } = require('@deepseek-ai/dsh-client-ui-primitives')
    const { bindSnapshotSelector } = require('@deepseek-ai/dsh-client-web-react')

    const NS = 'settings.archivedSessions'
    const STYLE_ID = '@deepseek-harness-desktop/client-ui-archived-sessions'
    const inject = ['slots', 'locale', 'remote', 'sessions', 'workspaces']

    const sessionIdSchema = {
      parse(value) {
        if (typeof value !== 'string' || value.length === 0) {
          throw new TypeError('sessionId must be a non-empty string')
        }
        return value
      },
    }

    const restoreResultSchema = {
      parse(value) {
        if (
          typeof value !== 'object'
          || value === null
          || typeof value.restored !== 'boolean'
          || !Array.isArray(value.archivedSessionIds)
          || !value.archivedSessionIds.every((id) => typeof id === 'string')
        ) {
          throw new TypeError('invalid archived session restore result')
        }
        return value
      },
    }

    const TYPERT_REMOTE = {
      package: '@deepseek-harness-desktop/client-ui-archived-sessions',
      descriptors: [
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
    }

    const css = `
      .dhd-archived-section {
        box-sizing: border-box;
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: 16px;
        padding-top: 4px;
      }

      .dhd-archived-heading {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .dhd-archived-title {
        margin: 0;
        color: var(--dsw-alias-label-primary);
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
      }

      .dhd-archived-description,
      .dhd-archived-empty,
      .dhd-archived-meta {
        margin: 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
      }

      .dhd-archived-list {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 12px;
      }

      .dhd-archived-row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--dsw-alias-border-l2);
      }

      .dhd-archived-row:last-child {
        border-bottom: none;
      }

      .dhd-archived-copy {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 2px;
      }

      .dhd-archived-name {
        overflow: hidden;
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        font-weight: 500;
        line-height: 22px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dhd-archived-empty {
        padding: 28px 16px;
        text-align: center;
      }
    `

    if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = STYLE_ID
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent = css
      document.head.appendChild(tag)
    }

    const zh = {
      nav: '已归档',
      title: '已归档会话',
      description: '这些会话仍保留在本地，你可以在这里查看或取消归档。',
      empty: '暂无已归档会话',
      ungrouped: '未分组',
      unavailableTime: '时间未知',
      cancel: '取消',
      cancelAria: '取消归档 {name}',
      restoring: '恢复中…',
      restoreFailedTitle: '取消归档失败',
      restoreFailedDescription: '插件无法更新归档状态。deepseek-ai/deepseek-harness 尚未提供公开的恢复归档 API，可能需要适配当前 Harness 版本。',
      close: '关闭',
    }

    const en = {
      nav: 'Archived',
      title: 'Archived sessions',
      description: 'These sessions remain stored locally. You can view or unarchive them here.',
      empty: 'No archived sessions',
      ungrouped: 'Ungrouped',
      unavailableTime: 'Time unavailable',
      cancel: 'Unarchive',
      cancelAria: 'Unarchive {name}',
      restoring: 'Restoring…',
      restoreFailedTitle: 'Could not unarchive session',
      restoreFailedDescription: 'The plugin could not update the archive state. deepseek-ai/deepseek-harness does not expose a public restore API yet, so this Harness version may require a compatibility update.',
      close: 'Close',
    }

    function workspaceTitle(sessionId, workspaces, fallback) {
      return workspaces.find((workspace) => workspace.sessionIds.includes(sessionId))?.title ?? fallback
    }

    function formatUpdatedAt(updatedAt, fallback) {
      if (!Number.isFinite(updatedAt)) return fallback
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(updatedAt))
    }

    function ArchivedSessionsSection({ restore, useSessions, useWorkspaces, t }) {
      const archivedSessionIds = useWorkspaces((state) => state.archivedSessionIds)
      const workspaces = useWorkspaces((state) => state.items)
      const sessionsById = useSessions((state) => state.byId)
      const [restoringId, setRestoringId] = useState(null)
      const [restoreError, setRestoreError] = useState(null)

      const rows = useMemo(() => [...archivedSessionIds].reverse().map((sessionId) => {
        const session = sessionsById[sessionId]
        const name = session?.displayTitle ?? sessionId
        return {
          id: sessionId,
          name,
          workspace: workspaceTitle(sessionId, workspaces, t('ungrouped')),
          updatedAt: formatUpdatedAt(session?.updatedAt, t('unavailableTime')),
        }
      }), [archivedSessionIds, sessionsById, t, workspaces])

      return jsxs(Fragment, {
        children: [
          jsxs('section', {
            className: 'dhd-archived-section',
            children: [
              jsxs('div', {
                className: 'dhd-archived-heading',
                children: [
                  jsx('h2', { className: 'dhd-archived-title', children: t('title') }),
                  jsx('p', { className: 'dhd-archived-description', children: t('description') }),
                ],
              }),
              rows.length === 0
                ? jsx('div', { className: 'dhd-archived-empty', children: t('empty') })
                : jsx('div', {
                    className: 'dhd-archived-list',
                    children: rows.map((row) => jsxs('div', {
                      className: 'dhd-archived-row',
                      children: [
                        jsxs('div', {
                          className: 'dhd-archived-copy',
                          children: [
                            jsx('div', { className: 'dhd-archived-name', title: row.name, children: row.name }),
                            jsx('div', { className: 'dhd-archived-meta', children: `${row.workspace} · ${row.updatedAt}` }),
                          ],
                        }),
                        jsx(Button, {
                          variant: 'outline',
                          size: 'sm',
                          disabled: restoringId !== null,
                          'aria-label': t('cancelAria', { name: row.name }),
                          onClick: async () => {
                            setRestoringId(row.id)
                            try {
                              await restore(row.id)
                            } catch (error) {
                              setRestoreError(error instanceof Error ? error.message : String(error))
                            } finally {
                              setRestoringId(null)
                            }
                          },
                          children: restoringId === row.id ? t('restoring') : t('cancel'),
                        }),
                      ],
                    }, row.id)),
                  }),
            ],
          }),
          jsx(Modal, {
            open: restoreError !== null,
            onClose: () => setRestoreError(null),
            closeLabel: t('close'),
            title: t('restoreFailedTitle'),
            description: restoreError === null
              ? t('restoreFailedDescription')
              : `${t('restoreFailedDescription')} (${restoreError})`,
            footer: jsx(Button, {
              variant: 'primary',
              onClick: () => setRestoreError(null),
              children: t('close'),
            }),
          }),
        ],
      })
    }

    async function apply(ctx) {
      const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'desktop-archived-sessions: dictionaries')
      const t = ctx.locale.bind(NS)
      const useSessions = bindSnapshotSelector(ctx.sessions.list)
      const useWorkspaces = bindSnapshotSelector(ctx.workspaces.list)
      const restore = async (sessionId) => {
        const result = await ctx.remote.archivedSessions.restore(sessionId)
        if (!result.ok) {
          throw new Error(`${result.error.code}: ${result.error.message}`)
        }
        return result.value
      }

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'archived-sessions',
        order: 30,
        label: () => t('nav'),
        locale: NS,
        inject: () => ({ restore, useSessions, useWorkspaces, t }),
      }, ArchivedSessionsSection))

      return disposeRemote
    }

    exports.NS = NS
    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
