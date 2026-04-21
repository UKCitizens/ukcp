/**
 * @file Footer.jsx
 * @description Shared footer component for UKCP.
 *
 * Sprint 6: banner background image removed. Background is now a solid light
 * green (--mantine-color-green-1) consistent with the UKCP green palette.
 * No background image in the footer.
 */

import { Box, Group, Text, Image } from '@mantine/core'
import classes from './Footer.module.css'
import communityPortalLogo from '../../assets/1UKCPlogo.png'

/**
 * Full-width application footer with centred site identification text.
 *
 * @returns {JSX.Element}
 */
export default function Footer() {
  return (
    <Group
      h="100%"
      justify="center"
      className={classes.footer}
    >
      <Box className={classes.footerInner}>
        <Group gap="xs" align="center">
          <Image src={communityPortalLogo} alt="Community Portal" h={28} w="auto" />
          <Text size="sm" c="green.9">UK Citizens Portal · v0.1.0</Text>
        </Group>
      </Box>
    </Group>
  )
}
