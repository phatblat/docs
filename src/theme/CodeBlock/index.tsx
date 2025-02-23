/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState, useRef } from "react";
import clsx from "clsx";
import Highlight, { defaultProps, Language } from "prism-react-renderer";
import copy from "copy-text-to-clipboard";
import rangeParser from "parse-numeric-range";
import type { Props } from "@theme/CodeBlock";
import Translate, { translate } from "@docusaurus/Translate";
import {
  ClipboardCheckIcon,
  ClipboardIcon,
  DuplicateIcon,
} from "@heroicons/react/outline";

import vsDark from "prism-react-renderer/themes/vsDark";

import styles from "./styles.module.css";

import { useThemeConfig, parseCodeBlockTitle } from "@docusaurus/theme-common";

const HighlightLinesRangeRegex = /{([\d,-]+)}/;

const HighlightLanguages = ["js", "jsBlock", "jsx", "python", "html"] as const;
type HighlightLanguage = typeof HighlightLanguages[number];

type HighlightLanguageConfig = {
  start: string;
  end: string;
};

// Supported types of highlight comments
const HighlightComments: Record<HighlightLanguage, HighlightLanguageConfig> = {
  js: {
    start: "\\/\\/",
    end: "",
  },
  jsBlock: {
    start: "\\/\\*",
    end: "\\*\\/",
  },
  jsx: {
    start: "\\{\\s*\\/\\*",
    end: "\\*\\/\\s*\\}",
  },
  python: {
    start: "#",
    end: "",
  },
  html: {
    start: "<!--",
    end: "-->",
  },
};

// Supported highlight directives
const HighlightDirectives = [
  "highlight-next-line",
  "highlight-start",
  "highlight-end",
];

const getHighlightDirectiveRegex = (
  languages: readonly HighlightLanguage[] = HighlightLanguages
) => {
  // to be more reliable, the opening and closing comment must match
  const commentPattern = languages
    .map((lang) => {
      const { start, end } = HighlightComments[lang];
      return `(?:${start}\\s*(${HighlightDirectives.join("|")})\\s*${end})`;
    })
    .join("|");
  // white space is allowed, but otherwise it should be on it's own line
  return new RegExp(`^\\s*(?:${commentPattern})\\s*$`);
};

// select comment styles based on language
const highlightDirectiveRegex = (lang: string) => {
  switch (lang) {
    case "js":
    case "javascript":
    case "ts":
    case "typescript":
      return getHighlightDirectiveRegex(["js", "jsBlock"]);

    case "jsx":
    case "tsx":
      return getHighlightDirectiveRegex(["js", "jsBlock", "jsx"]);

    case "html":
      return getHighlightDirectiveRegex(["js", "jsBlock", "html"]);

    case "python":
    case "py":
      return getHighlightDirectiveRegex(["python"]);

    default:
      // all comment types
      return getHighlightDirectiveRegex();
  }
};

export default function CodeBlock({
  children,
  className: languageClassName,
  metastring,
  title,
}: Props): JSX.Element {
  const { prism } = useThemeConfig();

  const [showCopied, setShowCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  // The Prism theme on SSR is always the default theme but the site theme
  // can be in a different mode. React hydration doesn't update DOM styles
  // that come from SSR. Hence force a re-render after mounting to apply the
  // current relevant styles. There will be a flash seen of the original
  // styles seen using this current approach but that's probably ok. Fixing
  // the flash will require changing the theming approach and is not worth it
  // at this point.
  useEffect(() => {
    setMounted(true);
  }, []);

  // TODO: the title is provided by MDX as props automatically
  // so we probably don't need to parse the metastring
  // (note: title="xyz" => title prop still has the quotes)
  const codeBlockTitle = parseCodeBlockTitle(metastring) || title;

  const button = useRef(null);
  let highlightLines: number[] = [];

  // In case interleaved Markdown (e.g. when using CodeBlock as standalone component).
  const content = Array.isArray(children)
    ? children.join("")
    : (children as string);

  if (metastring && HighlightLinesRangeRegex.test(metastring)) {
    // Tested above
    const highlightLinesRange = metastring.match(HighlightLinesRangeRegex)![1];
    highlightLines = rangeParser(highlightLinesRange).filter((n) => n > 0);
  }

  let language = languageClassName?.replace(/language-/, "") as Language;

  if (!language && prism.defaultLanguage) {
    language = prism.defaultLanguage as Language;
  }

  // only declaration OR directive highlight can be used for a block
  let code = content.replace(/\n$/, "");
  if (highlightLines.length === 0 && language !== undefined) {
    let range = "";
    const directiveRegex = highlightDirectiveRegex(language);
    // go through line by line
    const lines = content.replace(/\n$/, "").split("\n");
    let blockStart: number;
    // loop through lines
    for (let index = 0; index < lines.length; ) {
      const line = lines[index];
      // adjust for 0-index
      const lineNumber = index + 1;
      const match = line.match(directiveRegex);
      if (match !== null) {
        const directive = match
          .slice(1)
          .reduce(
            (final: string | undefined, item) => final || item,
            undefined
          );
        switch (directive) {
          case "highlight-next-line":
            range += `${lineNumber},`;
            break;

          case "highlight-start":
            blockStart = lineNumber;
            break;

          case "highlight-end":
            range += `${blockStart!}-${lineNumber - 1},`;
            break;

          default:
            break;
        }
        lines.splice(index, 1);
      } else {
        // lines without directives are unchanged
        index += 1;
      }
    }
    highlightLines = rangeParser(range);
    code = lines.join("\n");
  }

  const handleCopyCode = () => {
    copy(code);
    setShowCopied(true);

    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <Highlight
      {...defaultProps}
      key={String(mounted)}
      theme={vsDark}
      code={code}
      language={language}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <div className={styles.codeBlockContainer}>
          {codeBlockTitle && (
            <div style={style} className={styles.codeBlockTitle}>
              {codeBlockTitle}
            </div>
          )}
          <div className={clsx(styles.codeBlockContent, language)}>
            <pre
              /* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */
              tabIndex={0}
              className={clsx(className, styles.codeBlock, "thin-scrollbar")}
            >
              <code className={styles.codeBlockLines}>
                {tokens.map((line, i) => {
                  if (line.length === 1 && line[0].content === "") {
                    line[0].content = "\n"; // eslint-disable-line no-param-reassign
                  }

                  const lineProps = getLineProps({ line, key: i });
                  const shouldHighlight = highlightLines.includes(i + 1);
                  if (highlightLines.includes(i + 1)) {
                    lineProps.className +=
                      "bg-gray-800 docusaurus-highlight-code-line";
                    // lineProps.style=
                  }

                  let finalClass = clsx(
                    lineProps.className,
                    shouldHighlight && "bg-gray-700"
                  );

                  return (
                    <span key={i} {...lineProps} className={finalClass}>
                      {line.map((token, key) => {
                        let tokenProps = { ...getTokenProps({ token, key }) };
                        let className = tokenProps.className;

                        if (className.includes('inserted-sign')) {
                          className = clsx(className, 'bg-green-900')
                        }

                        if (className.includes('deleted-sign')) {
                          className = clsx(className, 'bg-red-900')
                        }

                        return (
                          <span
                            key={key}
                            {...tokenProps}
                            className={className}
                          />
                        );
                      })}
                    </span>
                  );
                })}
              </code>
            </pre>

            <button
              ref={button}
              type="button"
              aria-label={translate({
                id: "theme.CodeBlock.copyButtonAriaLabel",
                message: "Copy code to clipboard",
                description: "The ARIA label for copy code blocks button",
              })}
              className={clsx(
                styles.copyButton,
                "clean-btn",
                showCopied ? "bg-green-500" : ""
              )}
              onClick={handleCopyCode}
            >
              {showCopied ? (
                <div>
                  <ClipboardCheckIcon className="w-4 h-4 inline mr-1" />
                  <span className="text-xs">Copied</span>
                </div>
              ) : (
                <div>
                  <ClipboardIcon className="w-4 h-4 inline mr-1" />
                  <span className="text-xs">Copy</span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}
    </Highlight>
  );
}
