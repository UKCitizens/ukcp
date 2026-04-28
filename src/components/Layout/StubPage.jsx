/**
 * @file StubPage.jsx
 * @description Shared shell for UKCP placeholder pages.
 *
 * Renders the full site frame (header Row 1 + mid pane + footer) with
 * no navigation state. Used for pages that are defined but not yet built.
 * All walker/banner rows are suppressed. Nav icons are fully functional.
 */

import SiteHeader from '../SiteHeader.jsx'
import PageLayout from '../PageLayout.jsx'
import Footer from './Footer.jsx'
import { Title, Text, Box } from '@mantine/core'

/**
 * @param {{ title: string }} props
 * @returns {JSX.Element}
 */
export default function StubPage({ title }) {
  return (
    <PageLayout
      header={
        <SiteHeader
          onWalkerToggle={() => {}}
          row2Visible={false}
          row3Visible={false}
          loading={false}
          pendingPlace={null}
          walkerOpen={false}
          path={[]}
          onDismiss={() => {}}
          currentOptions={[]}
          onSelect={() => {}}
          crumbs={[]}
          navDepth={0}
        />
      }
      midPane={
        <Box p="xl">
          <Title order={2} mb="sm">{title}</Title>
          <Text c="dimmed">Coming soon.</Text>
        </Box>
      }
      footer={<Footer />}
    />
  )
}
