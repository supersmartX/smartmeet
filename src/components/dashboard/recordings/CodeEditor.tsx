import React from "react";
import Editor, { loader } from "@monaco-editor/react";
import { useTheme } from "next-themes";

// Ensure Monaco loads from a reliable CDN or local source if configured
loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" } });

interface CodeEditorProps {
  code: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language = "python",
  readOnly = true,
  onChange,
  height = "500px",
}) => {
  const { theme } = useTheme();

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800 bg-[#1e1e1e] shadow-inner">
      <Editor
        height={height}
        language={language}
        value={code}
        theme={theme === "light" ? "light" : "vs-dark"}
        options={{
          readOnly: readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "var(--font-geist-mono)",
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          formatOnPaste: true,
          formatOnType: true,
        }}
        onChange={onChange}
        loading={
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs uppercase tracking-widest font-bold">
            Loading Editor...
          </div>
        }
      />
    </div>
  );
};
