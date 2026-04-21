/**
 * @file CrumbTrail.jsx
 * @description Horizontal crumb trail for UKCP hierarchy navigation.
 * Renders the current selection path as clickable breadcrumb labels.
 * Clicking a crumb navigates back to that level. The last crumb is
 * non-interactive (current position). Renders nothing when path is empty.
 *
 * @deprecated Superseded by SiteHeaderRow3 breadcrumb line (Sprint 3).
 * Retained for reference only. Do not use in new code.
 */

import { Group, Text, Anchor, ActionIcon } from '@mantine/core'
import { IconX } from '@tabler/icons-react'

/**
 * CrumbTrail renders the active navigation path as clickable breadcrumbs.
 *
 * @param {{
 *   path:  Array<{ level: string, value: string }>,
 *   goTo:  (index: number) => void,
 *   reset: () => void
 * }} props
 * @returns {JSX.Element|null}
 */
export default function CrumbTrail({ path, goTo, reset }) {
  if (!path || path.length === 0) return null

  return (
    <Group gap={4} wrap="wrap" px="sm" py="xs">

      <ActionIcon
        size="xs"
        variant="subtle"
        aria-label="Clear navigation"
        onClick={reset}
      >
        <IconX size={12} />
      </ActionIcon>

      {path.map((crumb, index) => (
        <Group key={index} gap={4} wrap="nowrap">
          {index > 0 && (
            <Text size="sm" c="dimmed" lh={1}>›</Text>
          )}
          {index < path.length - 1 ? (
            <Anchor
              component="button"
              size="sm"
              onClick={() => goTo(index)}
            >
              {crumb.value}
            </Anchor>
          ) : (
            <Text size="sm" fw={500}>{crumb.value}</Text>
          )}
        </Group>
      ))}

    </Group>
  )
}
