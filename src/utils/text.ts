/**
 * Text utility functions for the SupersmartX application
 */

/**
 * Highlights search query matches in text
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @returns Array of parts for rendering
 */
export const highlightText = (text: string, query: string): Array<string | { match: string }> => {
  if (!query.trim()) return [text];
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return parts.map((part) => 
    part.toLowerCase() === query.toLowerCase() ? { match: part } : part
  );
};

/**
 * Truncates text to a specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Formats duration string (e.g., "18m", "1h 12m")
 * @param duration - Duration string to format
 * @returns Formatted duration
 */
export const formatDuration = (duration: string): string => {
  return duration;
};

/**
 * Capitalizes first letter of each word
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export const capitalizeWords = (text: string): string => {
  return text.replace(/\b\w/g, char => char.toUpperCase());
};
