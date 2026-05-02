/**
 * @file src/components/Posts/GeneralPostComposer.jsx
 * @description Thin wrapper around PostComposer for general_comment posts.
 *   No variant fields -- pure base composer.
 */

import PostComposer from './PostComposer.jsx'

/**
 * @param {{
 *   origin: { entity_type: string, entity_id: string, entity_name?: string, geo_scope?: object },
 *   onSuccess: (post: object) => void,
 * }} props
 */
export default function GeneralPostComposer({ origin, onSuccess }) {
  return (
    <PostComposer
      postType="general_comment"
      origin={origin}
      onSuccess={onSuccess}
    />
  )
}
