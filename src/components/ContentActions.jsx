/**
 * @file ContentActions.jsx
 * @description Contextual action menu for any site entity.
 *
 * Renders a compact ... icon that opens a Menu. Actions are computed from
 * the props supplied — only items with a handler are rendered.
 *
 * Used in-pane (MyIncludes remove), and will wire into content cards
 * site-wide once affordance placement is specified by Ali.
 */

import { Menu, ActionIcon } from '@mantine/core'
import {
  IconDotsVertical,
  IconExternalLink,
  IconHome,
  IconHomeOff,
  IconSquareCheck,
} from '@tabler/icons-react'

/**
 * @param {object}        props
 * @param {string}        props.entityType     - e.g. 'school', 'place', 'committee_forum'
 * @param {string}        props.entityId       - entity identifier
 * @param {string|null}   props.entityName     - display name for aria label
 * @param {boolean}       [props.isFollowing]  - true if already in My Home
 * @param {Function|null} [props.onOpen]       - navigate to entity detail
 * @param {Function|null} [props.onFollow]     - add to My Home
 * @param {Function|null} [props.onUnfollow]   - remove from My Home
 * @param {Function|null} [props.onSelect]     - mark for bulk action
 * @returns {JSX.Element}
 */
export default function ContentActions({
  entityType,
  entityId,
  entityName,
  isFollowing = false,
  onOpen     = null,
  onFollow   = null,
  onUnfollow = null,
  onSelect   = null,
}) {
  const hasAny = onOpen || onFollow || onUnfollow || onSelect
  if (!hasAny) return null

  return (
    <Menu shadow="sm" width={190} position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`Actions for ${entityName ?? entityId}`}
        >
          <IconDotsVertical size={14} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {onOpen && (
          <Menu.Item
            leftSection={<IconExternalLink size={14} />}
            onClick={onOpen}
          >
            Open
          </Menu.Item>
        )}

        {!isFollowing && onFollow && (
          <Menu.Item
            leftSection={<IconHome size={14} />}
            onClick={onFollow}
            color="green"
          >
            Add to My Home
          </Menu.Item>
        )}

        {isFollowing && onUnfollow && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconHomeOff size={14} />}
              onClick={onUnfollow}
              color="red"
            >
              Remove from My Home
            </Menu.Item>
          </>
        )}

        {onSelect && (
          <Menu.Item
            leftSection={<IconSquareCheck size={14} />}
            onClick={onSelect}
          >
            Select
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}
