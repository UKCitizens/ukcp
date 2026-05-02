/**
 * @file SiteHeaderRow1.jsx
 * @description Row 1 of the UKCP site header — the permanent nav bar.
 *
 * Layout:
 *   Left zone  — UKCP logo + wordmark (hotlink to site home "/").
 *   Right zone — single cluster: My Home | People | Help | Profile | Settings | Log in/out
 *
 * Behaviour:
 *   Logo navigates to "/" (Locations, the site home).
 *   Profile icon always visible — navigates to /profile.
 *   Log in/out is at the far right end.
 *   Log in navigates to /login.
 *
 * Standards:
 *   No inline styles. No sx prop. Layout via Mantine Group. Visual styles via
 *   CSS module. Row height is the ROW1_HEIGHT constant — no hardcoded px value.
 */

import { Box, Group, Text, ActionIcon, Image, Tooltip, Button } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserState } from '../../context/UserStateContext.jsx'
import UKCPLogo from '../../assets/UKCPlogo.png'
import {
  IconHome,
  IconUsers,
  IconUser,
  IconHelp,
  IconSettings,
} from '@tabler/icons-react'
import { ROW1_HEIGHT } from './HEADER_ROWS.js'
import classes from './SiteHeaderRow1.module.css'

/**
 * Renders the permanent Row 1 nav bar for the UKCP site header.
 *
 * @param {object}   props
 * @param {Function} [props.onWalkerToggle] - Unused. Retained for caller compatibility.
 * @param {boolean}  [props.loading]        - Unused. Retained for caller compatibility.
 * @returns {JSX.Element}
 */
export default function SiteHeaderRow1({ onWalkerToggle, loading }) {
  const navigate = useNavigate()
  const { session, user, profile, signOut } = useAuth()
  const { scopeLabel, activeNetworkLabel }  = useUserState()

  // profile shape (Section 3): { user, follows, joined_groups, recent_posts, claims, ... }
  const displayName = profile?.user?.display_name
                   || user?.email?.split('@')[0]
                   || 'Guest'

  return (
    <Box h={ROW1_HEIGHT} className={`${classes.row1} ${classes.row}`}>
      <Box className={classes.rowInner}>

        {/* Left zone — logo + wordmark hotlinked to site home */}
        <Tooltip label="Site Home" position="bottom" withArrow>
          <Group
            gap="xs"
            align="center"
            className={classes.logoLink}
            onClick={() => navigate('/')}
            role="link"
            aria-label="Site Home"
          >
            <Image src={UKCPLogo} alt="UKCP" h={28} w="auto" />
            <Text fw={700} size="xl" c="green.8">UKCP</Text>
            <Text size="xs" c="dimmed" hiddenFrom="sm">UK Citizens Portal</Text>
          </Group>
        </Tooltip>

        {/* Identity strip — who · where · mode. Hidden on small screens. */}
        <Box className={classes.identityStrip} visibleFrom="sm" aria-label="Current context">
          <span className={classes.who}>{displayName}</span>
          {scopeLabel && <span className={classes.where}>{scopeLabel}</span>}
          {activeNetworkLabel && <span className={classes.network}>{activeNetworkLabel}</span>}
        </Box>

        {/* Right zone — My Home | People | Help | Profile | Settings | Log in/out */}
        <Group gap="xs" align="center">

          <Tooltip label="My Home" position="bottom" withArrow>
            <ActionIcon variant="subtle" aria-label="My Home" onClick={() => navigate('/myhome')}>
              <IconHome size={24} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="People" position="bottom" withArrow>
            <ActionIcon variant="subtle" aria-label="People" onClick={() => navigate('/people')}>
              <IconUsers size={24} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Help" position="bottom" withArrow>
            <ActionIcon variant="subtle" aria-label="Help" onClick={() => navigate('/help')}>
              <IconHelp size={24} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Profile" position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              aria-label="Profile"
              onClick={() => {
                if (!session) {
                  try { sessionStorage.setItem('ukcp_login_redirect', '/profile') } catch {}
                  navigate('/login')
                } else {
                  navigate('/profile')
                }
              }}
            >
              <IconUser size={24} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Settings" position="bottom" withArrow>
            <ActionIcon variant="subtle" aria-label="Settings" onClick={() => navigate('/settings')}>
              <IconSettings size={24} />
            </ActionIcon>
          </Tooltip>

          {session ? (
            <Button size="compact-xs" variant="subtle" color="gray" onClick={signOut}>
              Log out
            </Button>
          ) : (
            <Button size="compact-sm" variant="light" color="green" onClick={() => navigate('/login')}>
              Log in
            </Button>
          )}

        </Group>
      </Box>
    </Box>
  )
}
