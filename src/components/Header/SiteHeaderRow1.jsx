/**
 * @file SiteHeaderRow1.jsx
 * @description Row 1 of the UKCP site header — the permanent nav bar.
 *
 * Layout:
 *   Left zone  — UKCP logo + wordmark (hotlink to site home "/").
 *   Right zone — two icon clusters separated by a small spacer:
 *                  Feature nav: My Home | Location Selector | My Vote
 *                  Utility:     Profile | Help | Settings
 *
 * Behaviour:
 *   Logo + wordmark navigate to "/" (Site Home) — Tooltip: "Site Home".
 *   Each icon has a Tooltip and navigates to its respective route.
 *   Location Selector also fires onWalkerToggle (when on /locations this
 *   toggles the walker; from other pages navigate is the primary action).
 *   If loading is true, a Mantine Loader (size="xs") renders adjacent to the
 *   Location Selector icon within the feature nav cluster.
 *
 * Standards:
 *   No inline styles. No sx prop. Layout via Mantine Group. Visual styles via
 *   CSS module. Row height is the ROW1_HEIGHT constant — no hardcoded px value.
 */

import { Box, Group, Text, ActionIcon, Loader, Image, Tooltip } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import UKCPLogo from '../../assets/UKCPlogo.png'
import {
  IconHome,
  IconMapPin,
  IconThumbUp,
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
 * @param {Function} [props.onWalkerToggle] - Called when the Location Selector
 *                                            icon is clicked; toggles the walker
 *                                            when already on /locations.
 * @param {boolean}  props.loading          - When true, renders a Loader adjacent
 *                                            to the Location Selector icon.
 * @returns {JSX.Element}
 */
export default function SiteHeaderRow1({ onWalkerToggle, loading }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { session } = useAuth()

  function handleLocationSelector() {
    // Only navigate if not already on /locations — re-navigating the same route
    // can trigger a component remount which briefly removes the fixed nav bar.
    if (pathname !== '/locations') navigate('/locations')
    if (onWalkerToggle) onWalkerToggle()
  }

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

        {/* Right zone — feature nav cluster + utility cluster */}
        <Group gap="md" align="center">

          {/* Feature nav: My Home, Location Selector (with optional loader), My Vote */}
          <Group gap="xs" align="center">

            <Tooltip label="My Home" position="bottom" withArrow>
              <ActionIcon variant="subtle" aria-label="My Home" onClick={() => navigate('/myhome')}>
                <IconHome size={24} />
              </ActionIcon>
            </Tooltip>

            {loading && <Loader size="xs" />}

            <Tooltip label="Location Selector" position="bottom" withArrow>
              <ActionIcon variant="subtle" aria-label="Location Selector" onClick={handleLocationSelector}>
                <IconMapPin size={24} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="My Vote" position="bottom" withArrow>
              <ActionIcon variant="subtle" aria-label="My Vote" onClick={() => navigate('/myvote')}>
                <IconThumbUp size={24} />
              </ActionIcon>
            </Tooltip>

          </Group>

          {/* Utility: Profile, Help, Settings */}
          <Group gap="xs" align="center">

            <Tooltip label={session ? 'Profile' : 'Register'} position="bottom" withArrow>
              <ActionIcon
                variant="subtle"
                aria-label={session ? 'Profile' : 'Register'}
                onClick={() => navigate(session ? '/profile' : '/register')}
              >
                <IconUser size={24} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Help" position="bottom" withArrow>
              <ActionIcon variant="subtle" aria-label="Help" onClick={() => navigate('/help')}>
                <IconHelp size={24} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Settings" position="bottom" withArrow>
              <ActionIcon variant="subtle" aria-label="Settings" onClick={() => navigate('/settings')}>
                <IconSettings size={24} />
              </ActionIcon>
            </Tooltip>

          </Group>

        </Group>
      </Box>
    </Box>
  )
}
