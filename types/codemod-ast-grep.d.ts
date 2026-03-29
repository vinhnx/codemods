declare module "codemod:ast-grep" {
  export interface Position {
    line: number;
    column: number;
    index: number;
  }

  export interface Range {
    start: Position;
    end: Position;
  }

  export interface Edit {
    startPos: number;
    endPos: number;
    insertedText: string;
  }

  export interface RuleConfig<L = unknown> {
    rule: {
      pattern?: string;
      kind?: string;
      any?: Array<{ pattern?: string; kind?: string; regex?: string }>;
      inside?: Record<string, unknown>;
      has?: Record<string, unknown>;
      follows?: Record<string, unknown>;
      precedes?: Record<string, unknown>;
      matches?: string;
      stopBy?: string | Record<string, unknown>;
      where?: Record<string, { regex?: string; kind?: string }>;
      [key: string]: unknown;
    };
    constraints?: Record<string, Record<string, unknown>>;
    utils?: Record<string, Record<string, unknown>>;
  }

  export interface DefinitionResult {
    node: SgNode;
    root: SgRoot;
  }

  export interface FileReferences {
    root: SgRoot;
    nodes: SgNode[];
  }

  export interface SgNode<L = unknown, K extends string = string> {
    find(matcher: RuleConfig<L> | Record<string, unknown>): SgNode | null;
    findAll(matcher: RuleConfig<L> | Record<string, unknown>): SgNode[];
    parent(): SgNode | null;
    children(): SgNode[];
    child(index: number): SgNode | null;
    next(): SgNode | null;
    nextAll(): SgNode[];
    prev(): SgNode | null;
    prevAll(): SgNode[];
    ancestors(): SgNode[];
    getRoot(): SgRoot;
    text(): string;
    kind(): K;
    range(): Range;
    is(kind: string): boolean;
    isLeaf(): boolean;
    isNamed(): boolean;
    isNamedLeaf(): boolean;
    id(): number;
    field(name: string): SgNode | null;
    fieldChildren(name: string): SgNode[];
    matches(matcher: RuleConfig<L> | Record<string, unknown>): boolean;
    inside(matcher: RuleConfig<L> | Record<string, unknown>): boolean;
    has(matcher: RuleConfig<L> | Record<string, unknown>): boolean;
    precedes(matcher: RuleConfig<L> | Record<string, unknown>): boolean;
    follows(matcher: RuleConfig<L> | Record<string, unknown>): boolean;
    getMatch(name: string): SgNode | null;
    getMultipleMatches(name: string): SgNode[];
    getTransformed(name: string): string | null;
    replace(text: string): Edit;
    commitEdits(edits: Edit[]): string;
    definition(): DefinitionResult | null;
    references(): FileReferences[];
  }

  export interface SgRoot<L = unknown> {
    root(): SgNode<L>;
    filename(): string;
    source(): string;
    write(content: string): void;
    rename(newPath: string): void;
  }

  export type Transform<L = unknown> = (
    root: SgRoot<L>,
    options?: {
      params?: Record<string, string>;
      matrixValues?: Record<string, string>;
    },
  ) => string | null | undefined | Promise<string | null | undefined>;

  export function parse(lang: string, src: string): SgRoot;
  export function parseAsync(lang: string, src: string): Promise<SgRoot>;
  export function jssgTransform(
    transformFn: Transform,
    pathToFile: string,
    language: string,
  ): Promise<string | null>;
}

declare module "codemod:ast-grep/langs/rust" {
  type Rust = "rust";
  export default Rust;
}

declare module "codemod:ast-grep/langs/tsx" {
  type TSX = "tsx";
  export default TSX;
}

declare module "codemod:ast-grep/langs/typescript" {
  type TypeScript = "typescript";
  export default TypeScript;
}

declare module "codemod:ast-grep/langs/javascript" {
  type JavaScript = "javascript";
  export default JavaScript;
}

declare module "codemod:ast-grep/langs/python" {
  type Python = "python";
  export default Python;
}

declare module "codemod:ast-grep/langs/go" {
  type Go = "go";
  export default Go;
}

declare module "codemod:ast-grep/langs/*" {
  type Lang = string;
  export default Lang;
}
