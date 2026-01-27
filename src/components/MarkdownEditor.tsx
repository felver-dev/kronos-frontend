import { useState, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
}

const MarkdownEditor = ({ value, onChange, placeholder, height = 400 }: MarkdownEditorProps) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Détecter le thème actuel
    const checkDarkMode = () => {
      const html = document.documentElement
      setIsDark(html.classList.contains('dark') || html.getAttribute('data-theme') === 'dark')
    }

    checkDarkMode()

    // Observer les changements de thème
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div 
      data-color-mode={isDark ? 'dark' : 'light'}
      className="markdown-editor-wrapper"
    >
      <style>{`
        .markdown-editor-wrapper .w-md-editor {
          border: 1px solid rgb(209 213 219);
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .dark .markdown-editor-wrapper .w-md-editor {
          border-color: rgb(75 85 99);
        }
        .markdown-editor-wrapper .w-md-editor-text-pre {
          font-size: 14px;
        }
        .markdown-editor-wrapper .w-md-editor-text-textarea {
          font-size: 14px;
        }
      `}</style>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        preview="edit"
        hideToolbar={false}
        visibleDragbar={true}
        height={height}
        textareaProps={{
          placeholder: placeholder || 'Écrivez votre contenu en Markdown...',
        }}
      />
    </div>
  )
}

export default MarkdownEditor
