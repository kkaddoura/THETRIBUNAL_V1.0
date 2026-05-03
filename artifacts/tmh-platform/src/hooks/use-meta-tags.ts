import { useEffect } from "react"

const SITE_NAME = "The Tribunal"
const DEFAULT_DESCRIPTION =
  "The voice of 541 million. Real debates, predictions, and voices from across MENA."
const DEFAULT_OG_IMAGE = "/opengraph.jpg"

export interface MetaTagsConfig {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: "website" | "article" | "profile"
}

function setMetaTag(attr: "property" | "name", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

export function useMetaTags({
  title,
  description,
  image,
  url,
  type = "website",
}: MetaTagsConfig = {}) {
  useEffect(() => {
    // -- Title --
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    document.title = fullTitle
    setMetaTag("property", "og:title", title || SITE_NAME)
    setMetaTag("name", "twitter:title", title || SITE_NAME)

    // -- Description --
    const desc = description || DEFAULT_DESCRIPTION
    setMetaTag("name", "description", desc)
    setMetaTag("property", "og:description", desc)
    setMetaTag("name", "twitter:description", desc)

    // -- Image --
    const img = image || DEFAULT_OG_IMAGE
    setMetaTag("property", "og:image", img)
    setMetaTag("name", "twitter:image", img)

    // -- URL --
    const pageUrl = url || window.location.href
    setMetaTag("property", "og:url", pageUrl)

    // -- Type --
    setMetaTag("property", "og:type", type)

    // -- Static tags (set once, don't change per-page) --
    setMetaTag("property", "og:site_name", SITE_NAME)
    setMetaTag("name", "twitter:card", "summary_large_image")
  }, [title, description, image, url, type])
}
