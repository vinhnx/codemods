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

function rewriteHyperUseStatements(source: string): string {
    const parsed = parse("rust", source);
    const rootNode = parsed.root() as SgNode<Rust>;
    const edits: Edit[] = [];

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use hyper::Client;" } })) {
        edits.push(useStatement.replace(`use ${CLIENT_PATH};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use hyper::Client as $ALIAS;" },
    })) {
        const alias = useStatement.getMatch("ALIAS");
        if (!alias) {
            continue;
        }

        edits.push(useStatement.replace(`use ${CLIENT_PATH} as ${alias.text()};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use hyper::client::HttpConnector;" },
    })) {
        edits.push(useStatement.replace(`use ${CONNECTOR_PATH};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use hyper::client::HttpConnector as $ALIAS;" },
    })) {
        const alias = useStatement.getMatch("ALIAS");
        if (!alias) {
            continue;
        }

        edits.push(useStatement.replace(`use ${CONNECTOR_PATH} as ${alias.text()};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use hyper::client::connect::HttpConnector;" },
    })) {
        edits.push(useStatement.replace(`use ${CONNECTOR_PATH};`));
    }

    for (const useStatement of rootNode.findAll({
        rule: { pattern: "use hyper::client::connect::HttpConnector as $ALIAS;" },
    })) {
        const alias = useStatement.getMatch("ALIAS");
        if (!alias) {
            continue;
        }

        edits.push(useStatement.replace(`use ${CONNECTOR_PATH} as ${alias.text()};`));
    }

    for (const useStatement of rootNode.findAll({ rule: { pattern: "use hyper::{$$$ITEMS};" } })) {
        const keep: string[] = [];
        const lifted: string[] = [];

        for (const item of useStatement.getMultipleMatches("ITEMS")) {
            const text = item.text().trim();
            const clientMatch = text.match(/^Client(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
            if (clientMatch) {
                lifted.push(`use ${CLIENT_PATH}${clientMatch[1] ? ` as ${clientMatch[1]}` : ""};`);
                continue;
            }

            const connectorMatch = text.match(
                /^client::(?:connect::)?HttpConnector(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/,
            );
            if (connectorMatch) {
                lifted.push(
                    `use ${CONNECTOR_PATH}${connectorMatch[1] ? ` as ${connectorMatch[1]}` : ""};`,
                );
                continue;
            }

            keep.push(text);
        }

        if (lifted.length > 0) {
            const lines: string[] = [];
            if (keep.length > 0) {
                lines.push(`use hyper::{${keep.join(", ")}};`);
            }
            lines.push(...lifted);
            edits.push(useStatement.replace(lines.join("\n")));
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
