/**
 * @file LocationInfo.jsx
 * @description Content panel for the Info tab. Handles three render modes:
 *
 *   'mp'   — Parliament Members API data: MP photo, name, party badge.
 *   'wiki' — Wikipedia extract + source link.
 *   'ward' — Local context from path (no external API). Shows geographic hierarchy.
 *
 *   Loading and error states are shared across all modes.
 *   Returns null when there is no label (no nav context).
 *
 * Props:
 *   contentType  — 'mp' | 'wiki' | null
 *   extract      — string|null    (wiki mode)
 *   thumbnail    — string|null    (wiki mode banner; mp mode photo)
 *   title        — string|null
 *   wikiUrl      — string|null
 *   mpName       — string|null    (mp mode)
 *   party        — string|null    (mp mode)
 *   partyColour  — string|null    (mp mode — hex without #)
 *   loading      — boolean
 *   error        — string|null
 *   label        — string|null    current location label
 *   wardInfo     — { ward, constituency, county, region, country }|null
 */

import { Stack, Text, Anchor, Loader, Center, Divider, Group, Avatar, Badge } from '@mantine/core'
import MiniMap from './MiniMap.jsx'

/**
 * @param {{
 *   contentType:  string|null,
 *   extract:      string|null,
 *   thumbnail:    string|null,
 *   title:        string|null,
 *   wikiUrl:      string|null,
 *   mpName:       string|null,
 *   party:        string|null,
 *   partyColour:  string|null,
 *   loading:      boolean,
 *   error:        string|null,
 *   label:        string|null,
 *   wardInfo:     object|null
 * }} props
 */
export default function LocationInfo({
  contentType, summary, extract, thumbnail, title, wikiUrl,
  mpName, party, partyColour, population, geoData,
  loading, error, label, wardInfo, lat, lng, onMapClick,
}) {
  // ── Ward — local context, no external fetch ─────────────────────────────
  if (wardInfo) {
    return (
      <Stack gap="sm" p="md">
        <Stack gap={2}>
          <Text size="sm" fw={600}>{wardInfo.ward}</Text>
          <Text size="xs" c="dimmed">Electoral ward</Text>
        </Stack>
        {population && (
          <>
            <Divider />
            <div>
              <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 2 }}>Population</Text>
              <Text size="xs" fw={500}>{population}</Text>
            </div>
          </>
        )}
        <Divider />
        <Stack gap={4}>
          <Text size="xs"><Text span c="dimmed" size="xs">Constituency: </Text>{wardInfo.constituency}</Text>
          <Text size="xs"><Text span c="dimmed" size="xs">County: </Text>{wardInfo.county}</Text>
          <Text size="xs"><Text span c="dimmed" size="xs">Region: </Text>{wardInfo.region}</Text>
          <Text size="xs"><Text span c="dimmed" size="xs">Country: </Text>{wardInfo.country}</Text>
        </Stack>
      </Stack>
    )
  }

  // No label — no context to display.
  if (!label) return null

  if (loading) {
    return (
      <Center style={{ height: '100%', minHeight: 120 }}>
        <Loader size="sm" color="green" />
      </Center>
    )
  }

  // ── MP card — constituency via Parliament Members API ───────────────────
  if (contentType === 'mp' && mpName) {
    const badgeColour = partyColour ? `#${partyColour}` : '#868e96'
    return (
      <Stack gap="md" p="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>
          Member of Parliament
        </Text>

        {/* MiniMap — top right, same pattern as geo content */}
        {lat && lng && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <MiniMap lat={lat} lng={lng} contentType="constituency" label={label} onMapClick={onMapClick} />
          </div>
        )}

        <Group gap="md" align="flex-start">
          {thumbnail && (
            <Avatar
              src={thumbnail}
              size={72}
              radius="sm"
              alt={mpName}
            />
          )}
          <Stack gap={6} style={{ flex: 1 }}>
            <Text fw={700} size="md">{mpName}</Text>
            {party && (
              <Badge
                size="sm"
                variant="filled"
                style={{ background: badgeColour, color: '#fff', width: 'fit-content' }}
              >
                {party}
              </Badge>
            )}
            <Text size="xs" c="dimmed">Constituency: {label}</Text>
            {population && (
              <Text size="xs" c="dimmed">Population: {population}</Text>
            )}
          </Stack>
        </Group>
        <Divider />
        <Anchor
          href={`https://members.parliament.uk/members/Commons`}
          target="_blank"
          rel="noopener noreferrer"
          size="xs"
          c="dimmed"
        >
          Source: UK Parliament Members API
        </Anchor>
      </Stack>
    )
  }

  // ── Geo content — country / region / county from L0 static file ───────────
  if (contentType && ['country', 'region', 'county'].includes(contentType)) {
    const g = geoData ?? {}
    const hasStats  = population || g.area
    const hasAny    = hasStats || g.motto || g.politics || g.economic ||
                      g.cultural || extract || g.history || g.environment || g.website

    return (
      <Stack gap={0} style={{ overflowY: 'auto', height: '100%' }}>

        {/* MiniMap — floated top-right when coordinates available */}
        {lat && lng && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px 0' }}>
            <MiniMap lat={lat} lng={lng} contentType={contentType} label={label} onMapClick={onMapClick} />
          </div>
        )}

        {/* Motto */}
        {g.motto && (
          <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f1f3f5' }}>
            <Text size="xs" fs="italic" c="dimmed" style={{ lineHeight: 1.5 }}>
              &ldquo;{g.motto}&rdquo;
            </Text>
          </div>
        )}

        {/* Stats row — population + area */}
        {hasStats && (
          <Group gap={0} style={{ borderBottom: '1px solid #f1f3f5' }}>
            {population && (
              <div style={{ flex: 1, padding: '8px 14px', borderRight: g.area ? '1px solid #f1f3f5' : 'none' }}>
                <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 2 }}>Population</Text>
                <Text size="xs" fw={500}>{population}</Text>
              </div>
            )}
            {g.area && (
              <div style={{ flex: 1, padding: '8px 14px' }}>
                <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 2 }}>Area</Text>
                <Text size="xs" fw={500}>{g.area}</Text>
              </div>
            )}
          </Group>
        )}

        {/* Political composition */}
        {g.politics && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f3f5' }}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Political composition</Text>
            <Text size="xs" c="dark">{g.politics}</Text>
          </div>
        )}

        {/* Blurb (f3) */}
        {extract && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f3f5' }}>
            <Text size="xs" style={{ lineHeight: 1.6 }}>{extract}</Text>
          </div>
        )}

        {/* Economic character */}
        {g.economic && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f3f5' }}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Economy</Text>
            <Text size="xs" style={{ lineHeight: 1.5 }}>{g.economic}</Text>
          </div>
        )}

        {/* Cultural identity */}
        {g.cultural && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f3f5' }}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Character</Text>
            <Text size="xs" style={{ lineHeight: 1.5 }}>{g.cultural}</Text>
          </div>
        )}

        {/* Historical note */}
        {g.history && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f3f5' }}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 4 }}>History</Text>
            <Text size="xs" style={{ lineHeight: 1.5 }}>{g.history}</Text>
          </div>
        )}

        {/* Environment / designations */}
        {g.environment && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f3f5' }}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Environment</Text>
            <Text size="xs" style={{ lineHeight: 1.5 }}>{g.environment}</Text>
          </div>
        )}

        {/* Official website */}
        {g.website && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f3f5' }}>
            <Anchor href={g.website} target="_blank" rel="noopener noreferrer" size="xs" c="dimmed">
              Official website
            </Anchor>
          </div>
        )}

        {/* Empty state */}
        {!hasAny && (
          <div style={{ padding: '14px' }}>
            <Text size="xs" c="dimmed">Content coming soon for {label}.</Text>
          </div>
        )}

      </Stack>
    )
  }

  // ── Error / no content fallback ─────────────────────────────────────────
  if (error || (!extract && !summary)) {
    return (
      <Stack gap="xs" p="md" align="center" style={{ minHeight: 80 }}>
        <Text size="xs" c="dimmed">
          No summary available for {label}.
        </Text>
      </Stack>
    )
  }

  // ── Wikipedia extract (+ optional curated summary) ──────────────────────
  return (
    <Stack gap="md" p="md" style={{ overflowY: 'auto', height: '100%' }}>
      {population && (
        <div>
          <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 2 }}>Population</Text>
          <Text size="xs" fw={500}>{population}</Text>
        </div>
      )}
      {summary && (
        <div>
          <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Summary</Text>
          <Text size="sm" style={{ lineHeight: 1.6 }}>{summary}</Text>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <Text size="sm" style={{ lineHeight: 1.6, flex: 1 }}>
          {extract}
        </Text>
        <MiniMap lat={lat} lng={lng} contentType={contentType} label={label} onMapClick={onMapClick} />
      </div>
      {wikiUrl && (
        <>
          <Divider />
          <Anchor
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="dimmed"
          >
            Source: Wikipedia — {title ?? label}
          </Anchor>
        </>
      )}
    </Stack>
  )
}
