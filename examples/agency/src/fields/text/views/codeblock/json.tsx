import { type CodeblockProps, Field as Codeblock } from "."

export function Field(props: CodeblockProps) {
  props.field.language = "JSON"
  props.field.options = {
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    formatOnPaste: true,
    formatOnType: true,
    scrollBeyondLastLine: false,
  }
  return Codeblock(props)
}