export const selectEditorState = ({ editor }) => {
  if (!editor) {
    return {
      isBold: false,
      isItalic: false,
      isBulletList: false,
      isOrderedList: false,
      highlightColor: null,
      canUndo: false,
      canRedo: false,
    }
  }

  return {
    isBold: editor.isActive('bold'),
    isItalic: editor.isActive('italic'),
    isBulletList: editor.isActive('bulletList'),
    isOrderedList: editor.isActive('orderedList'),
    highlightColor: editor.getAttributes('highlight')?.color ?? null,
    canUndo: editor.can().chain().focus().undo().run(),
    canRedo: editor.can().chain().focus().redo().run(),
  }
}
