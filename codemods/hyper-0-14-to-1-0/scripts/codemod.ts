import { parse } from "codemod:ast-grep";
import type { Edit, SgNode, Transform } from "codemod:ast-grep";
import type Rust from "codemod:ast-grep/langs/rust";

const CLIENT_PATH = "hyper_util::client::legacy::Client";
const CONNECTOR_PATH = "hyper_util::client::legacy::connect::HttpConnector";

function isLikelyHyperSource(source: string): boolean {
    return /\bhyper::|^\s*use\s+hyper(?:::{1,2}|\s*[{;])/m.test(source);
}

function applyEdits(rootNode: SgNode<Rust>, edits: Edit[]): string {
    if (edits.length === 0) {
        return rootNode.text();
    }

    const seen = new Set<string>();
    const uniqueEdits = edits
        .sort((left, right) => left.startPos - right.startPos || left.endPos - right.endPos)
        .filter((edit) => {
            const key = `${edit.startPos}:${edit.endPos}:${edit.insertedText}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

    return rootNode.commitEdits(uniqueEdits);
}

function extractGroupedImports(statement: string): string[] | null {
    const braceStart = statement.indexOf("{");
    const braceEnd = statement.lastIndexOf("}");
    if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) {
        return null;
    }

    return statement
        .slice(braceStart + 1, braceEnd)
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function rewriteDirectHyperUse(statement: string): string | null {
    if (/^use\s+hyper::Client(?:\s+as\s+\w+)?;$/.test(statement)) {
        return statement.replace("hyper::Client", CLIENT_PATH);
    }

    if (
        /^use\s+hyper::client::HttpConnector(?:\s+as\s+\w+)?;$/.test(statement) ||
        /^use\s+hyper::client::connect::HttpConnector(?:\s+as\s+\w+)?;$/.test(statement)
    ) {
        return statement
            .replace("hyper::client::connect::HttpConnector", CONNECTOR_PATH)
            .replace("hyper::client::HttpConnector", CONNECTOR_PATH);
    }

    return null;
}

function rewriteGroupedHyperUse(statement: string): string | null {
    if (!statement.startsWith("use hyper::{")) {
        return null;
    }

    const entries = extractGroupedImports(statement);
    if (!entries) {
        return null;
    }

    const keep: string[] = [];
    const lifted: string[] = [];

    for (const entry of entries) {
        const clientMatch = entry.match(/^Client(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
        if (clientMatch) {
            lifted.push(`use ${CLIENT_PATH}${clientMatch[1] ? ` as ${clientMatch[1]}` : ""};`);
            continue;
        }

        const connectorMatch = entry.match(
            /^client::(?:connect::)?HttpConnector(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/,
        );
        if (connectorMatch) {
            lifted.push(
                `use ${CONNECTOR_PATH}${connectorMatch[1] ? ` as ${connectorMatch[1]}` : ""};`,
            );
            continue;
        }

        keep.push(entry);
    }

    if (lifted.length === 0) {
        return null;
    }

    const lines: string[] = [];
    if (keep.length > 0) {
        lines.push(`use hyper::{${keep.join(", ")}};`);
    }
    lines.push(...lifted);

    return lines.join("\n");
}

function rewriteHyperUseStatements(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use $IMPORT;" } })) {
        const statement = useStatement.text();
        const direct = rewriteDirectHyperUse(statement);
        if (direct) {
            edits.push(useStatement.replace(direct));
            continue;
        }

        const grouped = rewriteGroupedHyperUse(statement);
        if (grouped) {
            edits.push(useStatement.replace(grouped));
        }
    }

    return applyEdits(rootNode, edits);
}

function rewriteHyperPaths(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const node of rootNode.findAll({ rule: { kind: "scoped_identifier" } })) {
        const text = node.text();
        if (text === "hyper::Client") {
            edits.push(node.replace(CLIENT_PATH));
        } else if (
            text === "hyper::client::HttpConnector" ||
            text === "hyper::client::connect::HttpConnector"
        ) {
            edits.push(node.replace(CONNECTOR_PATH));
        }
    }

    for (const node of rootNode.findAll({ rule: { kind: "scoped_type_identifier" } })) {
        const text = node.text();
        if (text === "hyper::Client") {
            edits.push(node.replace(CLIENT_PATH));
        } else if (
            text === "hyper::client::HttpConnector" ||
            text === "hyper::client::connect::HttpConnector"
        ) {
            edits.push(node.replace(CONNECTOR_PATH));
        }
    }

    return applyEdits(rootNode, edits);
}

const transform: Transform<Rust> = async (root: any) => {
    const source = root.root().text();

    if (!isLikelyHyperSource(source)) {
        return source;
    }

    const withUpdatedImports = rewriteHyperUseStatements(source);
    return rewriteHyperPaths(withUpdatedImports);
};

export default transform;
