"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Link2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { RICH_EDITOR_COLORS } from "@/components/ui/rich-editor-colors";

type Props = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
};

const FONT_SIZES = [
  { label: "S", value: "2" },
  { label: "M", value: "3" },
  { label: "L", value: "4" },
  { label: "XL", value: "5" },
  { label: "2XL", value: "6" },
];

export function RichEditor({ value, onChange, className, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    onChange(el.innerHTML);
  }, [onChange]);

  const exec = useCallback(
    (cmd: string, arg?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, arg ?? undefined);
      const el = editorRef.current;
      if (el) {
        isInternalChange.current = true;
        onChange(el.innerHTML);
      }
    },
    [onChange],
  );

  const addLink = useCallback(() => {
    const url = prompt("URL:");
    if (url) exec("createLink", url);
  }, [exec]);

  const setColor = useCallback(
    (color: string) => {
      exec("foreColor", color);
      setShowColors(false);
    },
    [exec],
  );

  const setFontSize = useCallback(
    (size: string) => {
      exec("fontSize", size);
      setShowSizes(false);
    },
    [exec],
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-brutal border-3 border-brutal bg-brutal-bg",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b-3 border-brutal bg-brutal-muted px-1.5 py-1">
        <ToolBtn title="Bold" onClick={() => exec("bold")}>
          <b>B</b>
        </ToolBtn>
        <ToolBtn title="Italic" onClick={() => exec("italic")}>
          <i>I</i>
        </ToolBtn>
        <ToolBtn title="Underline" onClick={() => exec("underline")}>
          <u>U</u>
        </ToolBtn>
        <Sep />
        <ToolBtn
          title="Bullet list"
          onClick={() => exec("insertUnorderedList")}
        >
          .
        </ToolBtn>
        <ToolBtn
          title="Numbered list"
          onClick={() => exec("insertOrderedList")}
        >
          1.
        </ToolBtn>
        <Sep />

        <div className="relative">
          <ToolBtn
            title="Text color"
            onClick={() => {
              setShowColors(!showColors);
              setShowSizes(false);
            }}
          >
            <span className="text-[10px]">A</span>
            <span className="absolute bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-brutal-destructive" />
          </ToolBtn>
          {showColors ? (
            <div className="absolute left-0 top-full z-20 mt-1 grid w-fit grid-cols-5 gap-1 rounded-brutal border-3 border-brutal bg-brutal-bg p-1.5 shadow-brutal">
              {RICH_EDITOR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-5 w-5 cursor-pointer rounded-brutal border-2 border-brutal transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <ToolBtn
            title="Font size"
            onClick={() => {
              setShowSizes(!showSizes);
              setShowColors(false);
            }}
          >
            <span className="text-[9px]">T</span>
            <span className="text-[11px]">T</span>
          </ToolBtn>
          {showSizes ? (
            <div className="absolute left-0 top-full z-20 mt-1 flex gap-0.5 rounded-brutal border-3 border-brutal bg-brutal-bg p-1 shadow-brutal">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setFontSize(s.value)}
                  className="cursor-pointer whitespace-nowrap rounded-brutal px-2 py-1 text-[10px] font-semibold text-brutal-fg hover:bg-brutal-muted"
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Sep />
        <ToolBtn title="Link" onClick={addLink}>
          <Link2 className="h-4 w-4 shrink-0" aria-hidden />
        </ToolBtn>
        <ToolBtn title="Remove format" onClick={() => exec("removeFormat")}>
          <X className="h-4 w-4 shrink-0" aria-hidden />
        </ToolBtn>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={() => {
          setShowColors(false);
          setShowSizes(false);
        }}
        data-placeholder={placeholder}
        className={cn(
          "max-h-[200px] min-h-[60px] overflow-auto px-2.5 py-2 text-xs outline-none",
          "empty:before:pointer-events-none empty:before:text-gray-600 empty:before:content-[attr(data-placeholder)]",
          "[&_a]:text-brutal-primary [&_a]:underline",
          "[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4",
          "[&_b]:font-bold [&_strong]:font-bold",
        )}
      />
    </div>
  );
}

function Sep() {
  return <div className="mx-0.5 h-4 w-px bg-brutal-fg" />;
}

function ToolBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-brutal text-[11px] font-semibold text-gray-600 transition-colors hover:bg-brutal-muted hover:text-brutal-fg"
    >
      {children}
    </button>
  );
}
