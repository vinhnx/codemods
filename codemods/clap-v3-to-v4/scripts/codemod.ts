import type { Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

function collapseNumArgsChains(source: string): string {
  return source.replace(
    /((?:\n[ \t]*\.[A-Za-z_][A-Za-z0-9_]*\([^()\n]*\))+)/g,
    (chain) => {
      const lines = chain.split("\n");
      let lastNumArgsLine = -1;

      for (let index = 0; index < lines.length; index += 1) {
        if (lines[index].includes(".num_args(")) {
          lastNumArgsLine = index;
        }
      }

      if (lastNumArgsLine === -1) {
        return chain;
      }

      return lines
        .filter(
          (line, index) => !line.includes(".num_args(") || index === lastNumArgsLine,
        )
        .join("\n");
    },
  );
}

function cleanupClapImports(source: string): string {
  return source.replace(
    /use\s+clap::\{([^}]*)\};/g,
    (statement, imports) => {
      if (!imports.includes("AppSettings")) {
        return statement;
      }

      const cleanedImports = imports
        .split(",")
        .map((entry: string) => entry.trim())
        .filter((entry: string) => entry.length > 0 && entry !== "AppSettings");

      if (cleanedImports.length === 0) {
        return "";
      }

      return `use clap::{${cleanedImports.join(", ")}};`;
    },
  );
}

const transform: Transform<Rust> = async (root) => {
  const rootNode = root.root();
  let source = rootNode.text();

  // === Derive attribute renames (text-based for spacing preservation) ===

  // #[clap(...)] on fields → #[arg(...)]
  // #[clap(...)] on structs/enums → #[command(...)]
  // We distinguish by context: if preceded by field-like indentation (inside struct body),
  // it's a field attribute. Otherwise it's a struct/enum-level attribute.

  // First, rename field-level #[clap(...)] → #[arg(...)]
  // Field attributes are typically indented more (inside struct/enum body)
  // and follow doc comments or other field attributes
  source = source.replace(
    /^(\s+)#\[clap\(([^)]*)\)\]/gm,
    (match, indent, attrs) => {
      // Remove standalone "value_parser" and "action" from the attr list
      let cleaned = attrs
        .replace(/,\s*value_parser\b/g, "")
        .replace(/\bvalue_parser\s*,\s*/g, "")
        .replace(/,\s*action\b(?!\s*=)/g, "")
        .replace(/\baction\s*,\s*(?!=)/g, "");
      const trimmed = cleaned.trim();
      if (trimmed === "value_parser" || trimmed === "action") {
        return ""; // Remove entire attribute
      }
      return `${indent}#[arg(${cleaned})]`;
    },
  );

  // Then rename struct/enum-level #[clap(...)] → #[command(...)]
  // These are at the top level (no leading whitespace, or minimal)
  source = source.replace(
    /^#\[clap\(([^)]*)\)\]/gm,
    "#[command($1)]",
  );

  // Clean up lines that became empty from removed attributes
  source = source.replace(/^\s*\n(?=\s*\n)/gm, "");

  // === Builder API method renames (text-based) ===

  source = source.replace(/\.takes_value\(true\)/g, ".num_args(1)");
  source = source.replace(/\n\s*\.takes_value\(false\)/g, "");
  source = source.replace(/\.takes_value\(false\)/g, "");
  source = source.replace(/\.multiple_values\(true\)/g, ".num_args(1..)");
  source = source.replace(/\.multiple\(true\)/g, ".num_args(1..)");
  source = source.replace(/\.min_values\((\d+)\)/g, ".num_args($1..)");
  source = source.replace(/\.max_values\((\d+)\)/g, ".num_args(1..=$1)");
  source = source.replace(/\.number_of_values\((\d+)\)/g, ".num_args($1)");
  // Remove .require_value_delimiter(true) — handle trailing comma on next line
  source = source.replace(/\n\s*\.require_value_delimiter\(true\)/g, "");
  source = source.replace(/\.require_value_delimiter\(true\)/g, "");

  // Remove .setting(AppSettings::ColoredHelp) — handle whole line
  source = source.replace(/\n\s*\.setting\(AppSettings::ColoredHelp\)/g, "");
  source = source.replace(/\.setting\(AppSettings::ColoredHelp\)/g, "");

  // Clean up: remove trailing whitespace on lines where methods were removed
  source = source.replace(/[ \t]+\n/g, "\n");
  // Clean up: remove lines that are now just whitespace after method removal
  source = source.replace(/\n(\s*\n){2,}/g, "\n\n");

  // === Error kind renames ===

  source = source.replace(/ErrorKind::EmptyValue/g, "ErrorKind::InvalidValue");
  source = source.replace(
    /ErrorKind::UnrecognizedSubcommand/g,
    "ErrorKind::InvalidSubcommand",
  );

  // === ArgEnum / arg_enum → ValueEnum / value_enum ===

  source = source.replace(/\barg_enum\b/g, "value_enum");
  source = source.replace(/\bArgEnum\b/g, "ValueEnum");

  source = collapseNumArgsChains(source);
  source = cleanupClapImports(source);

  return source;
};

export default transform;
