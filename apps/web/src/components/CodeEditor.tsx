import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { EditorView } from "@codemirror/view";
import { useEffect, useMemo, useState } from "react";

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const lineWrap = EditorView.lineWrapping;

function getExtensions(language: string) {
  switch (language) {
    case "Python":
      return [python(), lineWrap];
    case "JavaScript":
      return [javascript(), lineWrap];
    case "TypeScript":
      return [javascript({ typescript: true }), lineWrap];
    case "Java":
      return [java(), lineWrap];
    case "C++":
    case "C#":
      return [cpp(), lineWrap];
    case "Rust":
      return [rust(), lineWrap];
    default:
      return [lineWrap];
  }
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  minHeight?: string;
}

export function CodeEditor({ value, onChange, language, minHeight = "200px" }: CodeEditorProps) {
  const extensions = useMemo(() => getExtensions(language), [language]);
  const isDark = useIsDark();

  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      onChange={onChange}
      theme={isDark ? "dark" : "light"}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: false,
        drawSelection: true,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightActiveLine: true,
        highlightSelectionMatches: false,
        closeBracketsKeymap: true,
        searchKeymap: false,
        foldKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
      }}
      style={{ minHeight, fontSize: "12px" }}
      className="rounded-lg border border-stone-200 dark:border-gray-700 overflow-hidden"
    />
  );
}
