import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

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
type CodeMirrorExtensions = ComponentProps<typeof CodeMirror>["extensions"];

async function getLanguageExtensions(
  language: string,
): Promise<CodeMirrorExtensions> {
  switch (language) {
    case "Python": {
      const { python } = await import("@codemirror/lang-python");
      return [python(), lineWrap];
    }
    case "JavaScript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return [javascript(), lineWrap];
    }
    case "TypeScript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return [javascript({ typescript: true }), lineWrap];
    }
    case "Java": {
      const { java } = await import("@codemirror/lang-java");
      return [java(), lineWrap];
    }
    case "C++":
    case "C#": {
      const { cpp } = await import("@codemirror/lang-cpp");
      return [cpp(), lineWrap];
    }
    case "Rust": {
      const { rust } = await import("@codemirror/lang-rust");
      return [rust(), lineWrap];
    }
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
  const [extensions, setExtensions] = useState<CodeMirrorExtensions>(() => [
    lineWrap,
  ]);
  const isDark = useIsDark();

  useEffect(() => {
    let cancelled = false;

    void getLanguageExtensions(language).then((nextExtensions) => {
      if (!cancelled) setExtensions(nextExtensions);
    });

    return () => {
      cancelled = true;
    };
  }, [language]);

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
      className="rounded-lg border border-stone-400 dark:border-gray-600 overflow-hidden"
    />
  );
}
