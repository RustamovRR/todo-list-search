import EditorLexical from '@/components/shared/EditorLexical'
import EditorQuill from '@/components/shared/EditorQuill'
import SearchSection from '@/components/shared/SearchSection'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import EditorApp from './EditorApp'
import { Editor } from '@/components/editor'

export default function Home() {
  return (
    <div className="flex min-h-screen h-screen flex-col items-center justify-between">
      <header className=" flex-shrink-0 bg-foreground dark:bg-background text-background dark:text-foreground w-full p-4">
        <div>
          <h1 className="text-4xl font-bold">Logo</h1>
        </div>
      </header>
      <main className="w-full flex-grow">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={60}>
            {/* <EditorQuill /> */}
            {/* <EditorLexical /> */}
            {/* <EditorApp /> */}
            <Editor />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40}>
            <SearchSection />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <footer className="flex-shrink-0 bg-foreground dark:bg-background text-background dark:text-foreground w-full p-4">
        <div>
          <h1 className="text-4xl font-bold">Footer</h1>
        </div>
      </footer>
    </div>
  )
}
