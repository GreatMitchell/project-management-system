export function markdownToPlainText(source: string, maxLength?: number) {
  let text = source
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1 ')
    .replace(/~~~[^\n]*\n([\s\S]*?)~~~/g, '$1 ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/gi, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-+*]\s+|\d+[.)]\s+)/gm, '')
    .replace(/^\s*\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__|~~)(.*?)\1/g, '$2')
    .replace(/([*_])(.*?)\1/g, '$2')
    .replace(/\\([\\`*{}[\]()#+\-.!_>~])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (maxLength !== undefined && maxLength >= 0 && text.length > maxLength) text = maxLength <= 1 ? '…'.slice(0, maxLength) : `${text.slice(0, maxLength - 1).trimEnd()}…`
  return text
}
