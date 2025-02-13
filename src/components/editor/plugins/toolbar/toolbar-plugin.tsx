import { useEffect } from 'react'
import { useState } from 'react'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_CRITICAL, SELECTION_CHANGE_COMMAND } from 'lexical'

import { ToolbarContext } from '@/components/editor/context/toolbar-context'
import { Separator } from '@/components/ui/separator'

import { useEditorModal } from '../../hooks/use-modal'
import { BlockFormatDropDown } from './block-format-toolbar-plugin'
import { FormatBulletedList } from './block-format/format-bulleted-list'
import { FormatCheckList } from './block-format/format-check-list'
import { FormatCodeBlock } from './block-format/format-code-block'
import { FormatHeading } from './block-format/format-heading'
import { FormatNumberedList } from './block-format/format-numbered-list'
import { FormatParagraph } from './block-format/format-paragraph'
import { FormatQuote } from './block-format/format-quote'
import { BlockInsertPlugin } from './block-insert-plugin'
import { InsertCollapsibleContainer } from './block-insert/insert-collapsible-container'
import { InsertImage } from './block-insert/insert-image'
import { InsertInlineImage } from './block-insert/insert-inline-image'
import { InsertTable } from './block-insert/insert-table'
import { ClearFormattingToolbarPlugin } from './clear-formatting-toolbar-plugin'
import { CodeLanguageToolbarPlugin } from './code-language-toolbar-plugin'
import { ElementFormatToolbarPlugin } from './element-format-toolbar-plugin'
import { FontBackgroundToolbarPlugin } from './font-background-toolbar-plugin'
import { FontColorToolbarPlugin } from './font-color-toolbar-plugin'
import { FontFamilyToolbarPlugin } from './font-family-toolbar-plugin'
import { FontFormatToolbarPlugin } from './font-format-toolbar-plugin'
import { FontSizeToolbarPlugin } from './font-size-toolbar-plugin'
import { HistoryToolbarPlugin } from './history-toolbar-plugin'
import { LinkToolbarPlugin } from './link-toolbar-plugin'
import { SubSuperToolbarPlugin } from './subsuper-toolbar-plugin'

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()

  const [activeEditor, setActiveEditor] = useState(editor)
  const [blockType, setBlockType] = useState<string>('paragraph')

  const [modal, showModal] = useEditorModal()

  const $updateToolbar = () => {}

  useEffect(() => {
    return activeEditor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor)
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor])

  return (
    <ToolbarContext
      activeEditor={activeEditor}
      $updateToolbar={$updateToolbar}
      blockType={blockType}
      setBlockType={setBlockType}
      showModal={showModal}
    >
      {modal}
      <div className="flex items-center sticky top-0 z-10 gap-2 overflow-auto border-b p-1 pb-4 pt-0">
        <HistoryToolbarPlugin />
        <Separator orientation="vertical" className="h-8" />
        <BlockFormatDropDown>
          <FormatParagraph />
          <FormatHeading levels={['h1', 'h2', 'h3']} />
          <FormatNumberedList />
          <FormatBulletedList />
          <FormatCheckList />
          <FormatCodeBlock />
          <FormatQuote />
        </BlockFormatDropDown>
        {blockType === 'code' ? (
          <CodeLanguageToolbarPlugin />
        ) : (
          <>
            <FontFamilyToolbarPlugin />
            <FontSizeToolbarPlugin />

            <Separator orientation="vertical" className="h-8" />

            <FontFormatToolbarPlugin format="bold" />
            <FontFormatToolbarPlugin format="italic" />
            <FontFormatToolbarPlugin format="underline" />
            <FontFormatToolbarPlugin format="strikethrough" />
            <LinkToolbarPlugin />

            <Separator orientation="vertical" className="h-8" />
            <SubSuperToolbarPlugin />
            <ClearFormattingToolbarPlugin />
            <FontColorToolbarPlugin />
            <FontBackgroundToolbarPlugin />

            <Separator orientation="vertical" className="h-8" />

            <ElementFormatToolbarPlugin />

            <Separator orientation="vertical" className="h-8" />

            <BlockInsertPlugin>
              {/* <InsertImage /> */}
              {/* <InsertInlineImage /> */}
              <InsertCollapsibleContainer />
              <InsertTable />
            </BlockInsertPlugin>
          </>
        )}
      </div>
    </ToolbarContext>
  )
}
