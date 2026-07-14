import ReactMarkdown from "react-markdown"

export function MarkdownText({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  )
}
