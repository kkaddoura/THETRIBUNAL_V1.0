import { useMetaTags, type MetaTagsConfig } from "./use-meta-tags"

/**
 * Sets the page title and Open Graph / Twitter meta tags.
 *
 * Accepts either a plain title string (backwards-compatible) or a full
 * MetaTagsConfig object for pages that need custom descriptions / images.
 */
export function usePageTitle(titleOrConfig?: string | MetaTagsConfig) {
  const config: MetaTagsConfig =
    typeof titleOrConfig === "string"
      ? { title: titleOrConfig }
      : titleOrConfig ?? {}

  useMetaTags(config)
}
