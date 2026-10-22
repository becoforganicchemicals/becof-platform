import DOMPurify, { type WindowLike } from "dompurify";

// Article content is authored as raw HTML (see AdminLearn.tsx) and rendered
// via dangerouslySetInnerHTML on a fully public page — sanitize before it
// ever reaches the DOM so a compromised or malicious admin account (or a
// future less-trusted content source) can't plant a stored-XSS payload.
// DOMPurify's default profile already covers common rich-article markup
// (headings, links, images, lists, tables) while stripping <script>, event
// handler attributes, and javascript: URLs.
let purifier = DOMPurify;

// The build-time prerender runs in Node, with no browser window for DOMPurify
// to parse HTML in, so src/entry-server.tsx hands it a jsdom one instead.
export const setSanitizerWindow = (win: WindowLike) => {
  purifier = DOMPurify(win);
};

export const sanitizeHtml = (html: string) => purifier.sanitize(html);
