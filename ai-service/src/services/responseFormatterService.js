/**
 * Response Formatter Service
 * Formats AI responses into various output formats (text, markdown, HTML, etc.)
 * Handles rich media responses and platform-specific formatting
 */
const { JSDOM } = require('jsdom');

/**
 * Rich media response types
 */
const RESPONSE_TYPES = {
  TEXT: 'text', // Plain text
  MARKDOWN: 'markdown', // Markdown formatted text
  HTML: 'html', // HTML content
  CARD: 'card', // Card with title, subtitle, image
  CAROUSEL: 'carousel', // Multiple cards in a carousel
  BUTTON_LIST: 'button_list', // List of clickable buttons
  QUICK_REPLY: 'quick_reply', // Quick reply buttons
  IMAGE: 'image', // Image with optional caption
  FORM: 'form', // Form with fields
  CHART: 'chart', // Chart/graph data
  TABLE: 'table', // Table data
  COMPOSITE: 'composite' // Composite response (multiple types)
};

/**
 * Platform identifiers
 */
const PLATFORMS = {
  WEB: 'web',
  MOBILE: 'mobile',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  SMS: 'sms',
  EMAIL: 'email',
  SLACK: 'slack',
  DISCORD: 'discord',
  GENERIC: 'generic'
};

/**
 * Format a basic text response
 * @param {string} text - The text to format
 * @param {string} format - Output format (text/markdown/html)
 * @returns {Object} Formatted response
 */
function formatTextResponse(text, format = 'text') {
  if (!text) return { type: 'text', content: '' };
  
  switch (format.toLowerCase()) {
    case 'markdown':
      return {
        type: 'markdown',
        content: text
      };
    case 'html':
      // Convert newlines to <br>
      const htmlContent = text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
      
      return {
        type: 'html',
        content: htmlContent
      };
    case 'text':
    default:
      return {
        type: 'text',
        content: text
      };
  }
}

/**
 * Extract rich response elements from AI text
 * @param {string} text - AI-generated text
 * @returns {Object} Rich response elements
 */
function extractRichElements(text) {
  if (!text) return { type: 'text', content: text };
  
  // Check for special JSON format indicators
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.type && RESPONSE_TYPES[jsonData.type.toUpperCase()]) {
        // Replace the JSON block with empty string in the original text
        const cleanedText = text.replace(jsonMatch[0], '').trim();
        
        return {
          type: jsonData.type,
          content: jsonData.content || cleanedText,
          data: jsonData,
          originalText: text
        };
      }
    } catch (error) {
      console.error('Error parsing JSON from response:', error);
    }
  }
  
  // Check for image links
  const imageRegex = /(!\[.*?\]\((https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp))\))/gi;
  const imageMatches = [...text.matchAll(imageRegex)];
  
  if (imageMatches.length > 0) {
    // Extract images
    const images = imageMatches.map(match => {
      const altMatch = match[0].match(/!\[(.*?)\]/);
      const alt = altMatch ? altMatch[1] : '';
      const url = match[0].match(/\((https?:\/\/.*?)\)/)[1];
      
      return {
        url,
        alt
      };
    });
    
    // If there are multiple images, create a carousel
    if (images.length > 1) {
      return {
        type: 'carousel',
        items: images,
        originalText: text
      };
    }
    
    // Single image
    return {
      type: 'image',
      url: images[0].url,
      alt: images[0].alt,
      originalText: text
    };
  }
  
  // Check for tables
  if (text.includes('|') && text.includes('\n')) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Check if at least 3 lines with pipes (header, separator, and data)
    if (lines.length >= 3 && 
        lines[0].includes('|') && 
        lines[1].includes('|') && 
        lines[1].includes('-') && 
        lines[2].includes('|')) {
      
      // Extract table headers
      const headerLine = lines[0];
      const headers = headerLine
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
      
      // Skip separator line
      
      // Extract rows
      const rows = [];
      for (let i = 2; i < lines.length; i++) {
        if (lines[i].includes('|')) {
          const rowCells = lines[i]
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);
          
          if (rowCells.length > 0) {
            rows.push(rowCells);
          }
        }
      }
      
      if (headers.length > 0 && rows.length > 0) {
        return {
          type: 'table',
          headers,
          rows,
          originalText: text
        };
      }
    }
  }
  
  // Check for button lists or quick replies
  const buttonRegex = /\[(?:Button|Action|Click):\s*([^\]]+)\]\(([^)]+)\)/gi;
  const buttonMatches = [...text.matchAll(buttonRegex)];
  
  if (buttonMatches.length > 0) {
    const buttons = buttonMatches.map(match => ({
      text: match[1].trim(),
      value: match[2].trim()
    }));
    
    // Get text without buttons
    let cleanedText = text;
    buttonMatches.forEach(match => {
      cleanedText = cleanedText.replace(match[0], '');
    });
    
    return {
      type: 'button_list',
      content: cleanedText.trim(),
      buttons,
      originalText: text
    };
  }
  
  // Default to plain text
  return {
    type: 'text',
    content: text
  };
}

/**
 * Format a response based on detected elements and platform
 * @param {string} text - AI-generated text response
 * @param {string} platform - Target platform
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted rich response
 */
function formatRichResponse(text, platform = PLATFORMS.WEB, options = {}) {
  // Extract rich elements from text
  const richResponse = extractRichElements(text);
  
  // Default formatting options
  const defaultOptions = {
    preferMarkdown: true,
    includeOriginalText: false,
    convertHtmlToMarkdown: true
  };
  
  const formattingOptions = { ...defaultOptions, ...options };
  
  // Platform-specific formatting
  let platformResponse;
  switch (platform.toLowerCase()) {
    case PLATFORMS.WHATSAPP:
      platformResponse = formatForWhatsApp(richResponse);
      break;
    case PLATFORMS.TELEGRAM:
      platformResponse = formatForTelegram(richResponse);
      break;
    case PLATFORMS.SMS:
      platformResponse = formatForSMS(richResponse);
      break;
    case PLATFORMS.EMAIL:
      platformResponse = formatForEmail(richResponse);
      break;
    case PLATFORMS.MOBILE:
      platformResponse = formatForMobile(richResponse);
      break;
    case PLATFORMS.SLACK:
      platformResponse = formatForSlack(richResponse);
      break;
    case PLATFORMS.DISCORD:
      platformResponse = formatForDiscord(richResponse);
      break;
    case PLATFORMS.WEB:
    case PLATFORMS.GENERIC:
    default:
      platformResponse = richResponse;
      break;
  }
  
  // Include original text if requested
  if (!formattingOptions.includeOriginalText) {
    delete platformResponse.originalText;
  }
  
  return platformResponse;
}

/**
 * Format response for WhatsApp
 * @param {Object} richResponse - Rich response object
 * @returns {Object} WhatsApp-formatted response
 */
function formatForWhatsApp(richResponse) {
  const { type, content } = richResponse;
  
  // WhatsApp formatting differs based on response type
  switch (type) {
    case 'image':
      return {
        type: 'image',
        url: richResponse.url,
        caption: richResponse.alt || ''
      };
    case 'button_list':
      // WhatsApp has limited button support
      return {
        type: 'interactive',
        content: richResponse.content,
        buttons: richResponse.buttons.slice(0, 3).map(btn => ({
          text: btn.text,
          payload: btn.value
        }))
      };
    case 'carousel':
      // WhatsApp doesn't support true carousels, convert to list
      return {
        type: 'list',
        title: 'Options',
        items: richResponse.items.map((item, index) => ({
          title: `Item ${index + 1}`,
          subtitle: item.alt || '',
          imageUrl: item.url
        }))
      };
    case 'markdown':
    case 'html':
      // Convert to WhatsApp markdown-like format
      let formattedText = content;
      formattedText = formattedText
        .replace(/<strong>(.*?)<\/strong>/g, '*$1*')
        .replace(/<em>(.*?)<\/em>/g, '_$1_')
        .replace(/<code>(.*?)<\/code>/g, '```$1```')
        .replace(/<br>/g, '\n');
      
      return {
        type: 'text',
        content: formattedText
      };
    case 'text':
    default:
      return {
        type: 'text',
        content: content
      };
  }
}

/**
 * Format response for Telegram
 * @param {Object} richResponse - Rich response object
 * @returns {Object} Telegram-formatted response
 */
function formatForTelegram(richResponse) {
  const { type, content } = richResponse;
  
  // Telegram supports more rich features than WhatsApp
  switch (type) {
    case 'image':
      return {
        type: 'photo',
        url: richResponse.url,
        caption: richResponse.alt || ''
      };
    case 'button_list':
      return {
        type: 'text',
        content: richResponse.content,
        reply_markup: {
          inline_keyboard: richResponse.buttons.map(btn => ([{
            text: btn.text,
            callback_data: btn.value
          }]))
        }
      };
    case 'carousel':
      // Telegram supports media groups for multiple images
      return {
        type: 'media_group',
        media: richResponse.items.map(item => ({
          type: 'photo',
          media: item.url,
          caption: item.alt || ''
        }))
      };
    case 'table':
      // Format table as fixed-width text
      let tableText = '';
      tableText += richResponse.headers.join(' | ') + '\n';
      tableText += richResponse.headers.map(() => '---').join(' | ') + '\n';
      richResponse.rows.forEach(row => {
        tableText += row.join(' | ') + '\n';
      });
      
      return {
        type: 'text',
        content: tableText,
        parse_mode: 'Markdown'
      };
    case 'markdown':
      return {
        type: 'text',
        content: content,
        parse_mode: 'Markdown'
      };
    case 'html':
      return {
        type: 'text',
        content: content,
        parse_mode: 'HTML'
      };
    case 'text':
    default:
      return {
        type: 'text',
        content: content
      };
  }
}

/**
 * Format response for SMS
 * @param {Object} richResponse - Rich response object
 * @returns {Object} SMS-formatted response (text only)
 */
function formatForSMS(richResponse) {
  // SMS only supports text
  let textContent = '';
  
  switch (richResponse.type) {
    case 'table':
      // Simplified text table
      textContent = richResponse.headers.join(' | ') + '\n';
      richResponse.rows.forEach(row => {
        textContent += row.join(' | ') + '\n';
      });
      break;
    case 'button_list':
      textContent = richResponse.content + '\n\nOptions:\n';
      richResponse.buttons.forEach((btn, index) => {
        textContent += `${index + 1}. ${btn.text}\n`;
      });
      break;
    case 'carousel':
    case 'image':
      // Just mention there are images
      textContent = 'Image(s) available. Please view on a supported platform.';
      break;
    case 'markdown':
    case 'html':
      // Strip HTML/markdown formatting
      textContent = richResponse.content
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1');
      break;
    case 'text':
    default:
      textContent = richResponse.content;
      break;
  }
  
  return {
    type: 'text',
    content: textContent
  };
}

/**
 * Format response for Email
 * @param {Object} richResponse - Rich response object
 * @returns {Object} Email-formatted response
 */
function formatForEmail(richResponse) {
  // Email supports HTML
  let htmlContent = '';
  
  switch (richResponse.type) {
    case 'table':
      // HTML table
      htmlContent = '<table border="1" cellpadding="5">\n<tr>';
      richResponse.headers.forEach(header => {
        htmlContent += `<th>${header}</th>`;
      });
      htmlContent += '</tr>\n';
      
      richResponse.rows.forEach(row => {
        htmlContent += '<tr>';
        row.forEach(cell => {
          htmlContent += `<td>${cell}</td>`;
        });
        htmlContent += '</tr>\n';
      });
      
      htmlContent += '</table>';
      break;
    case 'button_list':
      htmlContent = `<div>${richResponse.content}</div>\n<div style="margin-top: 15px;">`;
      richResponse.buttons.forEach(btn => {
        htmlContent += `<a href="${btn.value}" style="display: inline-block; padding: 8px 12px; margin-right: 10px; background-color: #f0f0f0; border-radius: 4px; text-decoration: none; color: #333;">${btn.text}</a>`;
      });
      htmlContent += '</div>';
      break;
    case 'carousel':
      htmlContent = '<div style="display: flex; overflow-x: auto; padding: 10px 0;">';
      richResponse.items.forEach(item => {
        htmlContent += `<div style="margin-right: 15px; min-width: 200px;">
          <img src="${item.url}" alt="${item.alt || ''}" style="max-width: 100%; border-radius: 4px;">
          ${item.alt ? `<p style="margin-top: 5px;">${item.alt}</p>` : ''}
        </div>`;
      });
      htmlContent += '</div>';
      break;
    case 'image':
      htmlContent = `<div>
        <img src="${richResponse.url}" alt="${richResponse.alt || ''}" style="max-width: 100%;">
        ${richResponse.alt ? `<p>${richResponse.alt}</p>` : ''}
      </div>`;
      break;
    case 'html':
      htmlContent = richResponse.content;
      break;
    case 'markdown':
      // Convert markdown to HTML
      htmlContent = richResponse.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
      break;
    case 'text':
    default:
      htmlContent = richResponse.content.replace(/\n/g, '<br>');
      break;
  }
  
  return {
    type: 'html',
    content: htmlContent,
    plainText: stripHtml(htmlContent)
  };
}

/**
 * Format response for Mobile
 * @param {Object} richResponse - Rich response object
 * @returns {Object} Mobile-formatted response
 */
function formatForMobile(richResponse) {
  // Mobile apps can often handle JSON directly
  // Return with minimal modification
  return {
    ...richResponse,
    platform: 'mobile'
  };
}

/**
 * Format response for Slack
 * @param {Object} richResponse - Rich response object
 * @returns {Object} Slack-formatted response
 */
function formatForSlack(richResponse) {
  // Slack uses block kit
  let blocks = [];
  
  switch (richResponse.type) {
    case 'table':
      // Text representation of table for Slack
      let tableText = '```\n';
      tableText += richResponse.headers.join(' | ') + '\n';
      tableText += richResponse.headers.map(() => '---').join(' | ') + '\n';
      richResponse.rows.forEach(row => {
        tableText += row.join(' | ') + '\n';
      });
      tableText += '```';
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: tableText
        }
      });
      break;
    case 'button_list':
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: richResponse.content
        }
      });
      
      const buttons = richResponse.buttons.map(btn => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: btn.text
        },
        value: btn.value
      }));
      
      blocks.push({
        type: 'actions',
        elements: buttons
      });
      break;
    case 'carousel':
      richResponse.items.forEach(item => {
        blocks.push({
          type: 'image',
          image_url: item.url,
          alt_text: item.alt || 'Image'
        });
      });
      break;
    case 'image':
      blocks.push({
        type: 'image',
        image_url: richResponse.url,
        alt_text: richResponse.alt || 'Image'
      });
      break;
    case 'markdown':
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: richResponse.content
        }
      });
      break;
    case 'html':
      // Strip HTML and convert to mrkdwn
      const markdownText = richResponse.content
        .replace(/<br>/g, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ');
        
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: markdownText
        }
      });
      break;
    case 'text':
    default:
      blocks.push({
        type: 'section',
        text: {
          type: 'plain_text',
          text: richResponse.content
        }
      });
      break;
  }
  
  return {
    type: 'slack_blocks',
    blocks,
    text: richResponse.content // Fallback text
  };
}

/**
 * Format response for Discord
 * @param {Object} richResponse - Rich response object
 * @returns {Object} Discord-formatted response
 */
function formatForDiscord(richResponse) {
  // Discord supports embeds and markdown
  switch (richResponse.type) {
    case 'table':
      // Discord code block for table
      let tableText = '```\n';
      tableText += richResponse.headers.join(' | ') + '\n';
      tableText += richResponse.headers.map(() => '---').join(' | ') + '\n';
      richResponse.rows.forEach(row => {
        tableText += row.join(' | ') + '\n';
      });
      tableText += '```';
      
      return {
        type: 'text',
        content: tableText
      };
    case 'button_list':
      // Discord doesn't support true buttons in API
      // Create a message with a list
      let buttonText = richResponse.content + '\n\n';
      richResponse.buttons.forEach(btn => {
        buttonText += `• **${btn.text}**: ${btn.value}\n`;
      });
      
      return {
        type: 'text',
        content: buttonText
      };
    case 'carousel':
      // For Discord, return first image as embed, rest as URLs
      const firstImage = richResponse.items[0];
      const embed = {
        title: 'Images',
        image: {
          url: firstImage.url
        }
      };
      
      // Add other images as fields
      if (richResponse.items.length > 1) {
        embed.description = 'Additional images:';
        embed.fields = richResponse.items.slice(1).map((item, index) => ({
          name: `Image ${index + 2}`,
          value: item.url
        }));
      }
      
      return {
        type: 'embed',
        embed
      };
    case 'image':
      return {
        type: 'embed',
        embed: {
          image: {
            url: richResponse.url
          },
          description: richResponse.alt || ''
        }
      };
    case 'markdown':
    case 'text':
    default:
      return {
        type: 'text',
        content: richResponse.content
      };
  }
}

/**
 * Strip HTML tags and return plain text
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function stripHtml(html) {
  if (!html) return '';
  
  try {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || '';
  } catch (error) {
    // Fallback to regex-based stripping if JSDOM fails
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
}

module.exports = {
  formatTextResponse,
  formatRichResponse,
  extractRichElements,
  RESPONSE_TYPES,
  PLATFORMS
}; 