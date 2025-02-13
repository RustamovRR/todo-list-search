// RegExp maxsus belgilarni escape qilish
export const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Matnda search termini highlight qilish
export const highlightSearchTerms = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text

  const terms = searchTerm.trim().toLowerCase().split(/\s+/)
  let highlightedText = text

  terms.forEach((term) => {
    if (term.length < 2) return // Skip short terms
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi')
    highlightedText = highlightedText.replace(regex, '<mark class="search-match">$1</mark>')
  })

  return highlightedText
}

// To'liq kontentni formatlash va highlight qilish
export const formatFullContent = (content: string, searchTerm: string) => {
  // Matnni tozalash
  content = content.replace(/[\r\n\t\f\v ]+/g, ' ')
  content = content.replace(/\s+/g, ' ').trim()

  // Termslarni escape qilish
  const terms = searchTerm.trim().toLowerCase().split(/\s+/)
  let highlightedContent = content

  terms.forEach((term) => {
    if (term.length < 2) return // Skip short terms
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi')
    highlightedContent = highlightedContent.replace(regex, '<mark class="search-match">$1</mark>')
  })

  return highlightedContent
}
