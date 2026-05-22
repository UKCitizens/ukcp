/**
 * @file GeoFollowButton.jsx
 * @description Follow/unfollow toggle for geographic and place nav items.
 *
 * Uses usePlaceFollows (module-level cache) so state is shared across all
 * instances. Renders nothing when not logged in.
 *
 * Designed to sit absolutely-positioned inside a position:relative wrapper,
 * so it does not disturb the layout of the parent nav item.
 *
 * Props:
 *   entityId   -- type:slug key, e.g. 'county:Merseyside'
 *   entityName -- display name for the follow record
 */

import { ActionIcon, Tooltip } from '@mantine/core'
import { IconHome, IconHomeOff } from '@tabler/icons-react'
import { usePlaceFollows } from '../hooks/usePlaceFollows.js'

export default function GeoFollowButton({ entityId, entityName }) {
  const { followedSet, follow, unfollow, isLoggedIn } = usePlaceFollows()

  if (!isLoggedIn) return null

  const isFollowing = followedSet.has(String(entityId))

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()
    if (isFollowing) {
      unfollow(entityId)
    } else {
      follow(entityId, entityName)
    }
  }

  return (
    <Tooltip
      label={isFollowing ? 'Remove from My Home' : 'Add to My Home'}
      position="left"
      withArrow
      withinPortal
    >
      <ActionIcon
        variant={isFollowing ? 'filled' : 'subtle'}
        color={isFollowing ? 'blue' : 'gray'}
        size="xs"
        radius="sm"
        onClick={handleClick}
        aria-label={isFollowing ? 'Remove from My Home' : 'Add to My Home'}
        style={{ flexShrink: 0 }}
      >
        {isFollowing ? <IconHomeOff size={11} /> : <IconHome size={11} />}
      </ActionIcon>
    </Tooltip>
  )
}
