/**
 * Strip HTML tags dan ambil text content saja
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary div element
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Get text content and clean up whitespace
  return temp.textContent || temp.innerText || '';
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get plain text preview dari HTML content
 */
export const getTextPreview = (html: string, maxLength: number = 100): string => {
  const plainText = stripHtmlTags(html);
  return truncateText(plainText, maxLength);
};

/**
 * CSS untuk styling HTML content dengan proper table dan list styling
 */
export const htmlContentStyles = `
  .html-content {
    font-family: inherit;
    line-height: 1.6;
  }

  .html-content h1,
  .html-content h2,
  .html-content h3,
  .html-content h4,
  .html-content h5,
  .html-content h6 {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  .html-content p {
    margin-bottom: 1em;
  }

  .html-content ul,
  .html-content ol {
    margin-left: 1.5em;
    margin-bottom: 1em;
  }

  .html-content li {
    margin-bottom: 0.5em;
  }

  .html-content ul li {
    list-style-type: disc;
  }

  .html-content ol li {
    list-style-type: decimal;
  }

  .html-content table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
  }

  .html-content table th,
  .html-content table td {
    border: 1px solid currentColor;
    padding: 0.75em;
    text-align: left;
  }

  .html-content table th {
    font-weight: 600;
    background-color: rgba(0, 0, 0, 0.05);
  }

  .html-content blockquote {
    border-left: 4px solid currentColor;
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 1em;
    opacity: 0.8;
  }

  .html-content code {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-family: monospace;
  }

  .html-content pre {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 1em;
    border-radius: 0.5em;
    overflow-x: auto;
    margin-bottom: 1em;
  }

  .html-content pre code {
    background-color: transparent;
    padding: 0;
  }

  .html-content img {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
  }

  .dark .html-content table th {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .dark .html-content code {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .dark .html-content pre {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;
