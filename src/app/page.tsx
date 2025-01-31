import SearchSection from '@/components/shared/SearchSection'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import Editor from '@/components/editor'
import Head from 'next/head'
import Script from 'next/script'

export default function Home() {
  const YM_ID = process.env.NEXT_PUBLIC_YM_ID

  return (
    <div className="flex min-h-screen h-screen flex-col items-center justify-between">
      <Head>
        <title>
          <title>Kitob search</title>
          <meta name="yandex-verification" content="0c91a9b588bee8d3" />
        </title>
      </Head>

      {/* Yandex Metrica */}
      <Script
        id="ym-script"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(${YM_ID}, "init", {
              clickmap:true,
              trackLinks:true,
              accurateTrackBounce:true,
              webvisor:true
            });
          `,
        }}
      />
      {/* Yandex Metrica noscript */}
      <noscript>
        <div>
          <img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
        </div>
      </noscript>
      <header className=" flex-shrink-0 bg-foreground dark:bg-background text-background dark:text-foreground w-full p-4">
        <div>
          <h1 className="text-4xl font-bold">Logo</h1>
        </div>
      </header>
      <main className="w-full flex-grow">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={60}>
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
