import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LlmContentProps {
  content: string;
}

// 代码块组件，带复制按钮
const CodeBlock: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = useCallback(() => {
    // 提取纯文本内容
    const getText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(getText).join('');
      if (React.isValidElement(node)) return getText((node.props as any).children);
      return '';
    };
    const text = getText(children);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [children]);

  return (
    <div 
      style={{ position: 'relative' }} 
      className="my-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <pre
        style={{
          background: '#f1f3f7',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '12.5px',
          overflowX: 'auto',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        <code className={className}>{children}</code>
      </pre>
      {/* 复制按钮 - 常驻显示，无中文，双重叠方块图标 */}
      <button
        onClick={handleCopy}
        title={copied ? '已复制！' : '复制代码'}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.1)'}`,
          background: copied ? '#dcfce7' : (isHovered ? '#ffffff' : 'rgba(255,255,255,0.85)'),
          color: copied ? '#15803d' : '#475569',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease-in-out',
          zIndex: 10,
        }}
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )}
      </button>
    </div>
  );
};

export const LlmContent: React.FC<LlmContentProps> = ({ content }) => {
  // Split content into regular text and tool calls
  const parts: Array<{ type: 'text' | 'tool', content: string }> = [];
  
  // Process the content to identify tool calls
  // Create a combined regex that handles both direct tool calls and those wrapped in code blocks (xml or bash)
  const combinedToolCallRegex = /(```(?:xml|bash)\s*)?<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?:\s*<requires_approval>(.*?)<\/requires_approval>)?(\s*```)?/g;
  let lastIndex = 0;
  
  // Create a copy of the content to work with
  const contentCopy = content.toString();
  
  // Reset regex lastIndex
  combinedToolCallRegex.lastIndex = 0;
  
  // Process all tool calls (both direct and code block) in a single pass
  let match;
  while ((match = combinedToolCallRegex.exec(contentCopy)) !== null) {
    // Add text before the tool call
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: contentCopy.substring(lastIndex, match.index)
      });
    }
    
    // Add the tool call
    parts.push({
      type: 'tool',
      content: match[0]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text after the last tool call
  if (lastIndex < contentCopy.length) {
    parts.push({
      type: 'text',
      content: contentCopy.substring(lastIndex)
    });
  }

  // If no tool calls were found, just return the whole content
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: content
    });
  }
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          // Render regular text with markdown
          return (
            <ReactMarkdown 
              key={index}
              remarkPlugins={[remarkGfm]}
              components={{
                // Apply Tailwind classes to markdown elements
                p: ({node, ...props}) => <p className="mb-2" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                a: ({node, ...props}) => <a className="text-primary underline" {...props} />,
                code: ({node, className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  // 如果没有 language 样式，但是内容包含换行符，或者它其实是一个多行文本，那也应当是代码块
                  const isInline = !match && typeof children === 'string' && !children.includes('\n');
                  return isInline 
                    ? <code className="bg-base-300 px-1 rounded text-sm" {...props}>{children}</code>
                    : <CodeBlock className={className}>{children}</CodeBlock>;
                },
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-base-300 pl-4 italic my-2" {...props} />,
                table: ({node, ...props}) => <table className="border-collapse table-auto w-full my-2" {...props} />,
                th: ({node, ...props}) => <th className="border border-base-300 px-4 py-2 text-left" {...props} />,
                td: ({node, ...props}) => <td className="border border-base-300 px-4 py-2" {...props} />,
              }}
            >
              {part.content}
            </ReactMarkdown>
          );
        } else {
          // Render tool calls with special styling
          // We don't need to check for specific formats anymore since we're using a combined regex
          // Just return null for all tool calls to prevent empty bubbles
          return null;
        }
      })}
    </>
  );
};


