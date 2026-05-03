interface TitlePunctuationProps {
  punctuations?: string[]
}

/**
 * Renders punctuation characters after a title in primary color (crimson red).
 * Usage: <h1>The Tribunal<TitlePunctuation punctuations={["."]} /></h1>
 */
export function TitlePunctuation({ punctuations }: TitlePunctuationProps) {
  if (!punctuations?.length) return null
  return (
    <>
      {punctuations.map((char, i) => (
        <span
          key={i}
          style={{ color: "#DC143C", fontWeight: 900, display: "inline" }}
        >
          {char}
        </span>
      ))}
    </>
  )
}
