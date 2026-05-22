import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { ReferenceDoc } from '@/lib/types'

// Tiny markdown renderer — handles ## H2, ### H3, **bold**, *italic*, bullet lists, > blockquote.
// Kept inline (no extra deps) since the source content is curated by admins.
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n')
  const nodes: React.ReactNode[] = []
  let listBuffer: string[] = []
  const flushList = () => {
    if (!listBuffer.length) return
    nodes.push(
      <ul key={nodes.length} className="list-disc list-outside ml-5 space-y-1 my-3 text-gray-300">
        {listBuffer.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />)}
      </ul>
    )
    listBuffer = []
  }
  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-amber-300 rounded px-1.5 py-0.5 text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-amber-500 hover:underline" href="$2">$1</a>')

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flushList(); continue }
    if (line.startsWith('### ')) {
      flushList()
      nodes.push(<h3 key={nodes.length} className="text-white text-base font-semibold mt-5 mb-2">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      flushList()
      nodes.push(<h2 key={nodes.length} className="text-amber-500 text-xs uppercase tracking-widest font-semibold mt-6 mb-3">{line.slice(3)}</h2>)
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
    } else if (line.startsWith('> ')) {
      flushList()
      nodes.push(
        <blockquote key={nodes.length} className="border-l-2 border-amber-500/60 pl-4 my-4 text-amber-100/80 italic">
          <span dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }} />
        </blockquote>
      )
    } else {
      flushList()
      nodes.push(
        <p key={nodes.length} className="text-gray-300 text-sm leading-relaxed my-3"
           dangerouslySetInnerHTML={{ __html: inline(line) }} />
      )
    }
  }
  flushList()
  return nodes
}

export default async function ReferenceDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('reference_docs').select('*').eq('slug', slug).maybeSingle()
  if (!data) notFound()
  const doc = data as ReferenceDoc

  // If the doc has a file attachment, generate a fresh 1-hour signed URL
  let downloadUrl: string | null = null
  if (doc.file_path) {
    const { data: signed } = await supabase.storage
      .from('reference-files')
      .createSignedUrl(doc.file_path, 60 * 60)
    downloadUrl = signed?.signedUrl ?? null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/reference" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Reference Library
      </Link>
      <article className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-serif text-white mb-4 pb-4 border-b border-gray-800">{doc.title}</h1>
        {downloadUrl && doc.file_filename && (
          <a
            href={downloadUrl}
            download={doc.file_filename}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 bg-amber-500 text-black font-semibold py-2.5 px-4 rounded-lg text-sm hover:bg-amber-400"
          >
            <Download className="w-4 h-4" /> Download the Free PDF version
          </a>
        )}
        <div>{renderMarkdown(doc.content)}</div>
      </article>
    </div>
  )
}
