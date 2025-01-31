import { useState } from 'react'

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin'
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'

import { MARKDOWN_TRANSFORMERS } from '../transformers/markdown-transformers'
import { ContentEditable } from '../ui/content-editable'
import { CharacterLimitPlugin } from './actions/character-limit-plugin'
import { ClearEditorActionPlugin } from './actions/clear-editor-plugin'
import { EditModeTogglePlugin } from './actions/edit-mode-toggle-plugin'
import { ImportExportPlugin } from './actions/import-export-plugin'
import { MarkdownTogglePlugin } from './actions/markdown-toggle-plugin'
import { MaxLengthPlugin } from './actions/max-length-plugin'
import { ShareContentPlugin } from './actions/share-content-plugin'
import { SpeechToTextPlugin } from './actions/speech-to-text-plugin'
import { TreeViewPlugin } from './actions/tree-view-plugin'
import { AutoLinkPlugin } from './auto-link-plugin'
import { CodeActionMenuPlugin } from './code-action-menu-plugin'
import { CodeHighlightPlugin } from './code-highlight-plugin'
import { CollapsiblePlugin } from './collapsible-plugin'
import { ComponentPickerMenuPlugin } from './component-picker-plugin'
import { ContextMenuPlugin } from './context-menu-plugin'
import { DragDropPastePlugin } from './drag-drop-paste-plugin'
import { EmojiPickerPlugin } from './emoji-picker-plugin'
import { EmojisPlugin } from './emojis-plugin'
import { EquationsPlugin } from './equations-plugin'
import { FloatingLinkEditorPlugin } from './floating-link-editor-plugin'
import { FloatingTextFormatToolbarPlugin } from './floating-text-format-toolbar-plugin'
import { ImagesPlugin } from './images-plugin'
import { InlineImagePlugin } from './inline-image-plugin'
import { KeywordsPlugin } from './keywords-plugin'
import { LayoutPlugin } from './layout-plugin'
import { LinkPlugin } from './link-plugin'
import { ListMaxIndentLevelPlugin } from './list-max-indent-level-plugin'
import { MentionsPlugin } from './mentions-plugin'
import { TabFocusPlugin } from './tab-focus-plugin'
import { TableActionMenuPlugin } from './table-action-menu-plugin'
import { TableCellResizerPlugin } from './table-cell-resizer-plugin'
import { TableHoverActionsPlugin } from './table-hover-actions-plugin'
import { ToolbarPlugin } from './toolbar/toolbar-plugin'

const maxLength = Infinity

export function Plugins({}) {
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null)

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <div className="relative">
      <ToolbarPlugin />
      <div className="relative">
        <AutoFocusPlugin />
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="" ref={onRef}>
                <ContentEditable placeholder={'Start typing ...'} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <ClickableLinkPlugin />
        <CheckListPlugin />
        <HorizontalRulePlugin />
        <TablePlugin />
        <ListPlugin />
        <TabIndentationPlugin />
        <HashtagPlugin />
        <HistoryPlugin />

        <MentionsPlugin />
        <KeywordsPlugin />
        <EmojisPlugin />
        <ImagesPlugin />
        <InlineImagePlugin />
        <TableCellResizerPlugin />
        <TableHoverActionsPlugin anchorElem={floatingAnchorElem} />
        <TableActionMenuPlugin anchorElem={floatingAnchorElem} cellMerge={true} />
        <LayoutPlugin />
        <EquationsPlugin />
        <CollapsiblePlugin />

        <CodeHighlightPlugin />
        <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />

        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />

        <TabFocusPlugin />
        {/* <AutocompletePlugin /> */}
        <AutoLinkPlugin />
        <LinkPlugin />

        <ComponentPickerMenuPlugin />
        <ContextMenuPlugin />
        <DragDropPastePlugin />
        <EmojiPickerPlugin />

        <FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} />
        <FloatingTextFormatToolbarPlugin anchorElem={floatingAnchorElem} />

        <ListMaxIndentLevelPlugin />
      </div>
      <div className="clear-both flex h-10 items-center justify-between border-t p-1">
        <MaxLengthPlugin maxLength={maxLength} />
        <CharacterLimitPlugin maxLength={maxLength} charset="UTF-16" />
        <div className="flex justify-end">
          <SpeechToTextPlugin />
          <ShareContentPlugin />
          <ImportExportPlugin />
          <MarkdownTogglePlugin shouldPreserveNewLinesInMarkdown={true} />
          <EditModeTogglePlugin />
          <>
            <ClearEditorActionPlugin />
            <ClearEditorPlugin />
          </>
          <TreeViewPlugin />
        </div>
      </div>
    </div>
  )
}
