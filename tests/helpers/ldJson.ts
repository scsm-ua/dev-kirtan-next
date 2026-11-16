import type { ReactElement } from 'react';

type TNode = Record<string, unknown> & { '@id'?: string; '@type'?: string };

/** The JSON-LD object inside the `<script>` element an `LdJson*` component returns. */
export function readLdJson(element: ReactElement): { '@context': string; '@graph': TNode[] } {
  const { type, dangerouslySetInnerHTML } = element.props as {
    type: string;
    dangerouslySetInnerHTML: { __html: string };
  };

  if (element.type !== 'script' || type !== 'application/ld+json') {
    throw new Error('Not a JSON-LD script element.');
  }

  return JSON.parse(dangerouslySetInnerHTML.__html);
}

/**
 * `@id` references (objects with only `@id`) that point to no node of the graph.
 * `isOtherPage` tells which ids are defined by the JSON-LD of another page.
 */
export function findBrokenReferences(
  graph: TNode[],
  isOtherPage: (id: string) => boolean = () => false
): string[] {
  const ids = new Set(graph.map((node) => node['@id']));
  const broken: string[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;

    const keys = Object.keys(value);
    const id = (value as TNode)['@id'];
    if (keys.length === 1 && id && !ids.has(id) && !isOtherPage(id)) broken.push(id);
    keys.forEach((key) => visit(value[key]));
  };

  visit(graph);
  return broken;
}

/** First node of the graph with the given `@type`. */
export function getNode(graph: TNode[], type: string): TNode {
  const node = graph.find((candidate) => candidate['@type'] === type);
  if (!node) throw new Error(`No "${type}" node in the graph.`);

  return node;
}
