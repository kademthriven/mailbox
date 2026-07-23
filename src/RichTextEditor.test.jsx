import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RichTextEditor from './RichTextEditor'
import { selectEditorState } from './editorState'

describe('RichTextEditor state selector', () => {
  it('returns a safe initial state while Tiptap is still creating the editor', () => {
    expect(selectEditorState({ editor: null })).toEqual({
      isBold: false,
      isItalic: false,
      isBulletList: false,
      isOrderedList: false,
      highlightColor: null,
      canUndo: false,
      canRedo: false,
    })
  })

  it('finishes initializing the message editor without crashing', async () => {
    render(<RichTextEditor onChange={() => {}} />)

    expect(await screen.findByLabelText('Message body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })
})
