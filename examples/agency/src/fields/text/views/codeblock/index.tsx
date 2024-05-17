import React, { Dispatch, SetStateAction, useState } from "react";
import { editor } from "monaco-editor";
import Editor, { Monaco, OnChange } from "@monaco-editor/react";
import { Select } from "@keystone-ui/fields";
import { JSONValue, type FieldProps } from '@keystone-6/core/types'
import { type controller } from '@keystone-6/core/fields/types/text/views'

export type ViewProps = FieldProps<typeof controller> & {
  setShouldShowErrors: Dispatch<SetStateAction<boolean>>;
};

// Define the option type for language selection
type Option = { label: string; value: string; isDisabled?: boolean };

// Supported languages for the code editor
const SelectableLanguages: Option[] = [
  { label: "JSON", value: "json" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
];

// Utility function to find an option by its value
function getOption(options: Option[], value?: string): Option | null {
  return options.find((item) => item.value === value) || null;
}

export type CodeblockProps = ViewProps & {
  field: {
    language?: string;
    theme?: string;
    options?: JSONValue;
  };
}

export function Field(props: CodeblockProps) {
  const [language, setLanguage] = useState<Option | null>(
    getOption(SelectableLanguages, props.field.language || "json"),
  );
  const [lineHeight, setLineHeight] = useState<number>(19);

  // Adjust editor's line height based on font settings
  function onMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    const newLineHeight = editor.getOption(
      monaco.editor.EditorOption.fontInfo,
    ).lineHeight;
    if (lineHeight !== newLineHeight) {
      setLineHeight(newLineHeight);
    }
  }

  // Handle changes in the editor, ensuring `props.onChange` exists before calling
  const onChange: OnChange = (value) => {
    if (value !== undefined && props.onChange) {
      try {
        props.onChange({
          ...props.value,
          inner: { kind: "value", value },
        });
      } catch (error) {
        console.error("Error updating value:", error);
      }
    }
  };

  return (
    <>
      {!props.field.language && (
        <Select
          width="small"
          value={language}
          options={SelectableLanguages}
          menuPortalTarget={document.body}
          onChange={(value) => setLanguage(value)}
        />
      )}
      <Editor
        height={
          lineHeight *
          Math.min(
            25,
            Math.max(
              5,
              props.value.inner.kind === "null"
                ? 5
                : props.value.inner.value?.split(/\r\n|\r|\n/).length || 5,
            ),
          )
        }
        language={language?.value}
        value={props.value.inner.kind === "null" ? "" : props.value.inner.value}
        onChange={onChange}
        theme={props.field.theme || "vs-light"}
        options={
          props.field
            .options as editor.IStandaloneEditorConstructionOptions
        }
        onMount={onMount}
      />
    </>
  );
}