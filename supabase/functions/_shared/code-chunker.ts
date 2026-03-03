/**
 * Code chunker module for splitting source files into semantic chunks.
 * Produces file-level chunks plus extracted functions/classes for supported languages.
 */

export interface CodeChunk {
  chunk_type: "file" | "function" | "class";
  chunk_name: string;
  start_line: number;
  end_line: number;
  content: string;
  language: string;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  sql: "sql",
  md: "markdown",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
};

const SKIP_PATTERNS = [
  /node_modules/,
  /\.next\//,
  /dist\//,
  /build\//,
  /\.git\//,
  /coverage\//,
  /\.d\.ts$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  /\.min\.js$/,
  /\.map$/,
];

/**
 * Determine whether a file should be indexed based on its path.
 */
export function shouldIndexFile(filePath: string): boolean {
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(filePath)) return false;
  }
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return ext in EXTENSION_TO_LANGUAGE;
}

/**
 * Get the language identifier for a file based on its extension.
 */
export function getLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_LANGUAGE[ext] || "unknown";
}

/**
 * Extract function and class chunks from TypeScript/JavaScript source code.
 * Uses regex-based detection with brace-depth tracking.
 */
function extractTSJSChunks(
  lines: string[],
  language: string,
  filePath: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  // Patterns that start a function or class definition
  const functionPattern =
    /^(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(|function))/;
  const classPattern = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/;
  const methodPattern =
    /^\s+(?:async\s+)?(?:static\s+)?(?:get\s+|set\s+)?(\w+)\s*\(/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();

    let chunkType: "function" | "class" | null = null;
    let chunkName = "";

    const fnMatch = trimmed.match(functionPattern);
    const clsMatch = trimmed.match(classPattern);

    if (clsMatch) {
      chunkType = "class";
      chunkName = clsMatch[1];
    } else if (fnMatch) {
      chunkType = "function";
      chunkName = fnMatch[1] || fnMatch[2];
    }

    if (chunkType && chunkName) {
      const startLine = i;
      let braceDepth = 0;
      let foundOpen = false;
      let j = i;

      while (j < lines.length) {
        for (const ch of lines[j]) {
          if (ch === "{") {
            braceDepth++;
            foundOpen = true;
          } else if (ch === "}") {
            braceDepth--;
          }
        }
        if (foundOpen && braceDepth <= 0) break;
        j++;
      }

      const endLine = Math.min(j, lines.length - 1);
      const content = lines.slice(startLine, endLine + 1).join("\n");

      // Only add chunks that are reasonably sized (skip trivial one-liners)
      if (endLine - startLine >= 2) {
        chunks.push({
          chunk_type: chunkType,
          chunk_name: chunkName,
          start_line: startLine + 1,
          end_line: endLine + 1,
          content,
          language,
        });
      }

      i = endLine + 1;
      continue;
    }

    i++;
  }

  return chunks;
}

/**
 * Extract function and class chunks from Python source code.
 * Uses indentation-based block detection.
 */
function extractPythonChunks(
  lines: string[],
  language: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  const defPattern = /^(def|async\s+def)\s+(\w+)\s*\(/;
  const classPattern = /^class\s+(\w+)/;

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trimStart();
    const indent = lines[i].length - lines[i].trimStart().length;

    let chunkType: "function" | "class" | null = null;
    let chunkName = "";

    const defMatch = trimmed.match(defPattern);
    const clsMatch = trimmed.match(classPattern);

    if (clsMatch) {
      chunkType = "class";
      chunkName = clsMatch[1];
    } else if (defMatch) {
      chunkType = "function";
      chunkName = defMatch[2];
    }

    if (chunkType && chunkName) {
      const startLine = i;
      let j = i + 1;

      // Walk until we find a line at the same or lesser indentation (or EOF)
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine.trim() === "") {
          j++;
          continue;
        }
        const nextIndent = nextLine.length - nextLine.trimStart().length;
        if (nextIndent <= indent) break;
        j++;
      }

      const endLine = j - 1;
      const content = lines.slice(startLine, endLine + 1).join("\n");

      if (endLine - startLine >= 2) {
        chunks.push({
          chunk_type: chunkType,
          chunk_name: chunkName,
          start_line: startLine + 1,
          end_line: endLine + 1,
          content,
          language,
        });
      }

      i = j;
      continue;
    }

    i++;
  }

  return chunks;
}

/**
 * Extract function and struct/impl chunks from Rust source code.
 * Uses brace-depth tracking similar to TS/JS.
 */
function extractRustChunks(
  lines: string[],
  language: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  const fnPattern = /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/;
  const structPattern = /^(?:pub\s+)?(?:struct|enum|impl|trait)\s+(\w+)/;

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trimStart();

    let chunkType: "function" | "class" | null = null;
    let chunkName = "";

    const fnMatch = trimmed.match(fnPattern);
    const structMatch = trimmed.match(structPattern);

    if (structMatch) {
      chunkType = "class";
      chunkName = structMatch[1];
    } else if (fnMatch) {
      chunkType = "function";
      chunkName = fnMatch[1];
    }

    if (chunkType && chunkName) {
      const startLine = i;
      let braceDepth = 0;
      let foundOpen = false;
      let j = i;

      while (j < lines.length) {
        for (const ch of lines[j]) {
          if (ch === "{") {
            braceDepth++;
            foundOpen = true;
          } else if (ch === "}") {
            braceDepth--;
          }
        }
        if (foundOpen && braceDepth <= 0) break;
        j++;
      }

      const endLine = Math.min(j, lines.length - 1);
      const content = lines.slice(startLine, endLine + 1).join("\n");

      if (endLine - startLine >= 2) {
        chunks.push({
          chunk_type: chunkType,
          chunk_name: chunkName,
          start_line: startLine + 1,
          end_line: endLine + 1,
          content,
          language,
        });
      }

      i = endLine + 1;
      continue;
    }

    i++;
  }

  return chunks;
}

/**
 * Extract function chunks from Go source code.
 * Uses brace-depth tracking.
 */
function extractGoChunks(
  lines: string[],
  language: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  const fnPattern = /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/;
  const typePattern = /^type\s+(\w+)\s+(?:struct|interface)/;

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trimStart();

    let chunkType: "function" | "class" | null = null;
    let chunkName = "";

    const fnMatch = trimmed.match(fnPattern);
    const typeMatch = trimmed.match(typePattern);

    if (typeMatch) {
      chunkType = "class";
      chunkName = typeMatch[1];
    } else if (fnMatch) {
      chunkType = "function";
      chunkName = fnMatch[1];
    }

    if (chunkType && chunkName) {
      const startLine = i;
      let braceDepth = 0;
      let foundOpen = false;
      let j = i;

      while (j < lines.length) {
        for (const ch of lines[j]) {
          if (ch === "{") {
            braceDepth++;
            foundOpen = true;
          } else if (ch === "}") {
            braceDepth--;
          }
        }
        if (foundOpen && braceDepth <= 0) break;
        j++;
      }

      const endLine = Math.min(j, lines.length - 1);
      const content = lines.slice(startLine, endLine + 1).join("\n");

      if (endLine - startLine >= 2) {
        chunks.push({
          chunk_type: chunkType,
          chunk_name: chunkName,
          start_line: startLine + 1,
          end_line: endLine + 1,
          content,
          language,
        });
      }

      i = endLine + 1;
      continue;
    }

    i++;
  }

  return chunks;
}

/**
 * Chunk a source file into semantic code chunks.
 * Always produces a file-level chunk, plus function/class extractions for supported languages.
 */
export function chunkFile(filePath: string, content: string): CodeChunk[] {
  const language = getLanguage(filePath);
  const lines = content.split("\n");

  // File-level chunk (always included)
  const fileChunk: CodeChunk = {
    chunk_type: "file",
    chunk_name: filePath,
    start_line: 1,
    end_line: lines.length,
    content,
    language,
  };

  // Extract sub-chunks based on language
  let subChunks: CodeChunk[] = [];

  switch (language) {
    case "typescript":
    case "javascript":
      subChunks = extractTSJSChunks(lines, language, filePath);
      break;
    case "python":
      subChunks = extractPythonChunks(lines, language);
      break;
    case "rust":
      subChunks = extractRustChunks(lines, language);
      break;
    case "go":
      subChunks = extractGoChunks(lines, language);
      break;
  }

  return [fileChunk, ...subChunks];
}
