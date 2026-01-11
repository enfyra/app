import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import type { AnyExtension } from '@tiptap/core'

const lowlight = createLowlight()

export const tiptapExtensions: AnyExtension[] = [
  StarterKit.configure({
    codeBlock: false,
    link: false,
  }) as AnyExtension,
  Placeholder.configure({
    placeholder: 'Type something...',
  }) as AnyExtension,
  Underline as AnyExtension,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }) as AnyExtension,
  Link.configure({
    openOnClick: false,
  }) as AnyExtension,
  Image as AnyExtension,
  Table.configure({
    resizable: true,
  }) as AnyExtension,
  TableRow as AnyExtension,
  TableHeader as AnyExtension,
  TableCell as AnyExtension,
  CodeBlockLowlight.configure({
    lowlight,
  }) as AnyExtension,
]
