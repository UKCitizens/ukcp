/**
 * @file Settings.jsx
 * @description Settings page. Initially hosts the Data Manager tool.
 * Additional settings sections (System, Access) are stubbed in the tab bar.
 */

import { useState } from 'react'
import { Tabs, Box } from '@mantine/core'
import SiteHeader from '../components/SiteHeader.jsx'
import PageLayout from '../components/PageLayout.jsx'
import Footer from '../components/Layout/Footer.jsx'
import DataManager from '../components/DataManager/DataManager.jsx'

export default function Settings() {
  const [tab, setTab] = useState('data')

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
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={setTab}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
          >
            <Tabs.List>
              <Tabs.Tab value="data">Data Manager</Tabs.Tab>
              <Tabs.Tab value="system" disabled>System</Tabs.Tab>
              <Tabs.Tab value="access" disabled>Access</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel
              value="data"
              style={{ flex: 1, minHeight: 0, overflow: 'hidden', paddingTop: 8 }}
            >
              <DataManager />
            </Tabs.Panel>
          </Tabs>
        </Box>
      }
      footer={<Footer />}
    />
  )
}
