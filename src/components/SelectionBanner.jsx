/**
 * @file SelectionBanner.jsx
 * @description Banner displayed when a place has been clicked but not yet
 * confirmed. Shows the place name, type, and crumb context with Confirm and
 * Cancel actions. Renders nothing when place is null.
 *
 * @deprecated Superseded by SiteHeaderRow2 in Sprint 3. Retained for
 * reference only. Do not use in new code.
 */

import { Paper, Group, Text, Button, Stack } from '@mantine/core'
import classes from './SelectionBanner.module.css'

/**
 * Formats the navigation path as a readable breadcrumb string.
 *
 * @param {Array<{ level: string, value: string }>} path - Navigation path.
 * @returns {string} e.g. "East Midlands › Lincolnshire"
 */
function formatCrumb(path) {
  if (!Array.isArray(path) || path.length === 0) return ''
  return path.map(p => p.value).join(' › ')
}

/**
 * Renders a selection confirmation banner for a pending place choice.
 *
 * @param {{
 *   place:     object|null,
 *   path:      Array<{ level: string, value: string }>,
 *   onConfirm: () => void,
 *   onDismiss: () => void
 * }} props
 * @returns {JSX.Element|null}
 */
export default function SelectionBanner({ place, path, onConfirm, onDismiss }) {
  if (!place) return null

  const crumb = formatCrumb(path)

  return (
    <Paper className={classes.banner} radius="sm" p="md" mb="sm">
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={2}>
          <Text fw={700} size="lg">{place.PlaceName}</Text>
          <Text size="sm" c="dimmed">
            {place.Type}{crumb ? ` · ${crumb}` : ''}
          </Text>
        </Stack>
        <Group gap="xs">
          <Button
            variant="filled"
            className={classes.confirmButton}
            onClick={onConfirm}
          >
            Select
          </Button>
          <Button
            variant="subtle"
            color="gray"
            onClick={onDismiss}
          >
            Cancel
          </Button>
        </Group>
      </Group>
    </Paper>
  )
}
