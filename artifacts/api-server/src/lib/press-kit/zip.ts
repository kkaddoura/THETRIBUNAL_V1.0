/**
 * ZIP bundler for Studio downloads. Wraps a set of named buffers into a
 * single in-memory ZIP archive.
 */

import JSZip from "jszip"

export interface ZipEntry {
  name: string
  buffer: Buffer
}

export async function bundleZip(entries: ZipEntry[]): Promise<Buffer> {
  const zip = new JSZip()
  for (const entry of entries) {
    zip.file(entry.name, entry.buffer)
  }
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } })
  return out
}
