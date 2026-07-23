import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Button, ButtonGroup, Stack } from 'react-bootstrap'
import { selectEditorState } from './editorState'

const highlightColors = [
  { color: '#fff1a8', label: 'Highlight yellow' },
  { color: '#b8f2dc', label: 'Highlight mint' },
  { color: '#ffd0d8', label: 'Highlight pink' },
]

function ToolbarButton({ active = false, icon, label, onClick, disabled = false }) {
  return (
    <Button
      type="button"
      variant={active ? 'primary' : 'light'}
      className="editor-tool"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
    >
      <i className={`bi ${icon}`} aria-hidden="true" />
    </Button>
  )
}

function RichTextEditor({ onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'compose-editor-content',
        'aria-label': 'Message body',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        html: currentEditor.getHTML(),
        text: currentEditor.getText(),
        isEmpty: currentEditor.isEmpty,
      })
    },
  })

  const editorState = useEditorState({
    editor,
    selector: selectEditorState,
  })

  if (!editor) {
    return <div className="compose-editor-loading">Opening editor...</div>
  }

  return (
    <div className="compose-editor">
      <EditorContent editor={editor} />

      <div className="compose-toolbar" aria-label="Message formatting">
        <Stack direction="horizontal" gap={2} className="flex-wrap">
          <ButtonGroup aria-label="Text styles">
            <ToolbarButton
              active={editorState.isBold}
              icon="bi-type-bold"
              label="Bold"
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              active={editorState.isItalic}
              icon="bi-type-italic"
              label="Italic"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
          </ButtonGroup>

          <ButtonGroup aria-label="Lists">
            <ToolbarButton
              active={editorState.isBulletList}
              icon="bi-list-ul"
              label="Bulleted list"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              active={editorState.isOrderedList}
              icon="bi-list-ol"
              label="Numbered list"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
          </ButtonGroup>

          <div className="highlight-tools" aria-label="Highlight color">
            {highlightColors.map(({ color, label }) => (
              <Button
                key={color}
                type="button"
                variant="light"
                className={`highlight-swatch ${
                  editorState.highlightColor === color ? 'active' : ''
                }`}
                aria-label={label}
                title={label}
                aria-pressed={editorState.highlightColor === color}
                onClick={() =>
                  editor.chain().focus().toggleHighlight({ color }).run()
                }
              >
                <span style={{ backgroundColor: color }} />
              </Button>
            ))}
          </div>

          <ButtonGroup aria-label="Edit history">
            <ToolbarButton
              icon="bi-arrow-counterclockwise"
              label="Undo"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editorState.canUndo}
            />
            <ToolbarButton
              icon="bi-arrow-clockwise"
              label="Redo"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editorState.canRedo}
            />
          </ButtonGroup>
        </Stack>
      </div>
    </div>
  )
}

export default RichTextEditor
