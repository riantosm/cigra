import { useState } from 'react';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { TextStyle } from 'react-native';

import type { ImageStyle } from 'react-native-fast-image';

import SecureImage from '@/components/atoms/SecureImage';
import { colors } from '@/theme/colors';

export interface RichTextContentProps {
  // Rich Text HTML dari WYSIWYG editor backend (subset tag: p, h1–h6, ol/ul/li, blockquote,
  // strong/b, em/i, u, s, a, br, hr, img, span/div).
  html: string;
}

// ---------------------------------------------------------------------------
// Parser HTML minimal → pohon node. Cukup untuk keluaran editor Rich Text
// (bukan HTML sembarang). Tag di luar whitelist "di-unwrap" (anak-anaknya tetap dirender).
// ---------------------------------------------------------------------------

interface ElementNode {
  type: 'element';
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
}
interface TextNode {
  type: 'text';
  text: string;
}
type HtmlNode = ElementNode | TextNode;

const VOID_TAGS = new Set(['img', 'br', 'hr']);
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'figure',
  'pre',
  'table',
]);

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  middot: '·',
  bull: '•',
  deg: '°',
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  }
  return attrs;
}

function parseHtml(html: string): HtmlNode[] {
  const root: ElementNode = { type: 'element', tag: '#root', attrs: {}, children: [] };
  const stack: ElementNode[] = [root];
  const tokenRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^<>"']|"[^"]*"|'[^']*')*)\/?>|<!--[\s\S]*?-->/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (!text) return;
    const decoded = decodeEntities(text);
    stack[stack.length - 1].children.push({ type: 'text', text: decoded });
  };

  while ((m = tokenRe.exec(html))) {
    pushText(html.slice(lastIndex, m.index));
    lastIndex = tokenRe.lastIndex;

    const token = m[0];
    if (token.startsWith('<!--')) continue;
    const tag = m[1].toLowerCase();
    const isClose = token[1] === '/';

    if (isClose) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const node: ElementNode = { type: 'element', tag, attrs: parseAttrs(m[2] ?? ''), children: [] };
    stack[stack.length - 1].children.push(node);
    if (!VOID_TAGS.has(tag) && !token.endsWith('/>')) stack.push(node);
  }
  pushText(html.slice(lastIndex));
  return root.children;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const INLINE_STYLE: Record<string, TextStyle> = {
  strong: { fontWeight: '700' },
  b: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  i: { fontStyle: 'italic' },
  u: { textDecorationLine: 'underline' },
  s: { textDecorationLine: 'line-through' },
  strike: { textDecorationLine: 'line-through' },
  del: { textDecorationLine: 'line-through' },
  code: { fontFamily: 'monospace', fontSize: 13 },
  sup: { fontSize: 10 },
  sub: { fontSize: 10 },
};

const HEADING_STYLE: Record<string, TextStyle> = {
  h1: styleOf(21, '800'),
  h2: styleOf(19, '800'),
  h3: styleOf(17, '700'),
  h4: styleOf(15, '700'),
  h5: styleOf(14, '700'),
  h6: styleOf(13, '700'),
};

function styleOf(fontSize: number, fontWeight: TextStyle['fontWeight']): TextStyle {
  return { fontSize, fontWeight, color: colors.heading, lineHeight: fontSize * 1.35 };
}

function textContainsImage(nodes: HtmlNode[]): boolean {
  return nodes.some(
    n =>
      n.type === 'element' &&
      (n.tag === 'img' || (BLOCK_TAGS.has(n.tag) ? false : textContainsImage(n.children))),
  );
}

// Re-home URL gambar `/api/secure-files/...` ke API base yang dikonfigurasi (URL contoh backend
// sering `http://localhost:8000`). URL absolut lain diteruskan apa adanya.
function normalizeImageSrc(src: string): string {
  const marker = '/secure-files/';
  const idx = src.indexOf(marker);
  if (idx !== -1) return `secure-files/${src.slice(idx + marker.length)}`;
  return src;
}

function ArticleImage({ src }: { src: string }) {
  const [ratio, setRatio] = useState(16 / 10);
  const [boxWidth, setBoxWidth] = useState(0);
  const height = boxWidth > 0 ? Math.round(boxWidth / ratio) : 0;
  return (
    <View
      style={[styles.imageWrap, height > 0 ? { height } : styles.imagePlaceholder]}
      onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}>
      {boxWidth > 0 && height > 0 ? (
        <SecureImage
          path={normalizeImageSrc(src)}
          resizeMode="contain"
          style={{ width: boxWidth, height } as ImageStyle}
          onLoad={e => {
            const { width, height: h } = e.nativeEvent;
            if (width > 0 && h > 0) setRatio(width / h);
          }}
        />
      ) : null}
    </View>
  );
}

function renderInline(nodes: HtmlNode[], keyPrefix: string, inherited?: TextStyle) {
  const out: ReactNode[] = [];
  nodes.forEach((node, i) => {
    const key = `${keyPrefix}.${i}`;
    if (node.type === 'text') {
      if (node.text) out.push(node.text);
      return;
    }
    if (node.tag === 'br') {
      out.push('\n');
      return;
    }
    if (node.tag === 'img') return; // ditangani di level blok
    if (node.tag === 'a') {
      const href = node.attrs.href;
      out.push(
        <Text
          key={key}
          style={[inherited, styles.link]}
          onPress={href ? () => Linking.openURL(href).catch(() => {}) : undefined}>
          {renderInline(node.children, key, { ...inherited, ...styles.link })}
        </Text>,
      );
      return;
    }
    const style = INLINE_STYLE[node.tag];
    const merged = { ...inherited, ...style };
    out.push(
      <Text key={key} style={style}>
        {renderInline(node.children, key, merged)}
      </Text>,
    );
  });
  return out;
}

// Render anak-anak sebuah blok: kelompokkan node inline menjadi paragraf <Text>, sisipkan
// blok/gambar sebagai elemen tersendiri di antaranya.
function renderBlockChildren(nodes: HtmlNode[], keyPrefix: string) {
  const out: ReactNode[] = [];
  let inlineBuf: HtmlNode[] = [];
  let group = 0;

  const flush = () => {
    const hasContent = inlineBuf.some(
      n => (n.type === 'text' && n.text.trim()) || n.type === 'element',
    );
    if (hasContent) {
      const key = `${keyPrefix}:p${group++}`;
      out.push(
        <Text key={key} style={styles.paragraph}>
          {renderInline(inlineBuf, key)}
        </Text>,
      );
    }
    inlineBuf = [];
  };

  nodes.forEach((node, i) => {
    if (node.type === 'element' && (BLOCK_TAGS.has(node.tag) || node.tag === 'img')) {
      flush();
      out.push(renderBlock(node, `${keyPrefix}:b${i}`));
    } else {
      inlineBuf.push(node);
    }
  });
  flush();
  return out;
}

function renderListItem(node: ElementNode, marker: string, key: string) {
  const inline: HtmlNode[] = [];
  const nested: HtmlNode[] = [];
  node.children.forEach(child => {
    if (child.type === 'element' && (child.tag === 'ul' || child.tag === 'ol')) nested.push(child);
    else inline.push(child);
  });
  return (
    <View key={key} style={styles.li}>
      <Text style={styles.liMarker}>{marker}</Text>
      <View style={styles.liBody}>
        {textContainsImage(inline) ? (
          renderBlockChildren(inline, `${key}:c`)
        ) : (
          <Text style={styles.paragraph}>{renderInline(inline, `${key}:c`)}</Text>
        )}
        {nested.map((n, i) => renderBlock(n as ElementNode, `${key}:n${i}`))}
      </View>
    </View>
  );
}

function renderBlock(node: HtmlNode, key: string): ReactNode {
  if (node.type === 'text') {
    return node.text.trim() ? (
      <Text key={key} style={styles.paragraph}>
        {node.text}
      </Text>
    ) : null;
  }

  const { tag, children } = node;

  if (tag === 'img') {
    const src = node.attrs.src;
    return src ? <ArticleImage key={key} src={src} /> : null;
  }
  if (tag === 'hr') return <View key={key} style={styles.hr} />;
  if (tag === 'br') return null;

  if (HEADING_STYLE[tag]) {
    return (
      <Text key={key} style={[styles.heading, HEADING_STYLE[tag]]}>
        {renderInline(children, key)}
      </Text>
    );
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = children.filter(
      (c): c is ElementNode => c.type === 'element' && c.tag === 'li',
    );
    return (
      <View key={key} style={styles.list}>
        {items.map((li, i) =>
          renderListItem(li, tag === 'ol' ? `${i + 1}.` : '•', `${key}:li${i}`),
        )}
      </View>
    );
  }

  if (tag === 'blockquote') {
    return (
      <View key={key} style={styles.blockquote}>
        {renderBlockChildren(children, key)}
      </View>
    );
  }

  if (tag === 'pre') {
    return (
      <View key={key} style={styles.pre}>
        <Text style={styles.preText}>{renderInline(children, key)}</Text>
      </View>
    );
  }

  // p, div, figure, table, #root, atau tag tak dikenal → kontainer transparan.
  return (
    <View key={key} style={tag === 'p' || tag === 'div' ? styles.block : undefined}>
      {renderBlockChildren(children, key)}
    </View>
  );
}

export default function RichTextContent(props: RichTextContentProps) {
  const nodes = parseHtml(props.html ?? '');
  return <View>{renderBlockChildren(nodes, 'r')}</View>;
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 14.5,
    lineHeight: 23,
    color: colors.textBody,
    marginBottom: 10,
  },
  heading: {
    marginTop: 8,
    marginBottom: 8,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  list: {
    marginBottom: 10,
    gap: 6,
  },
  li: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  liMarker: {
    fontSize: 14.5,
    lineHeight: 23,
    color: colors.textMuted,
    minWidth: 18,
  },
  liBody: {
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryTintBorder,
    paddingLeft: 12,
    marginBottom: 10,
  },
  pre: {
    backgroundColor: colors.chipSurface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  preText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.textBody,
  },
  hr: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 14,
  },
  imageWrap: {
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.chipSurface,
  },
  imagePlaceholder: {
    height: 180,
  },
});
