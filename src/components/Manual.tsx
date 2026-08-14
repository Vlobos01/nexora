import ReactMarkdown, { type Components } from 'react-markdown';
import manualMd from '../../MANUAL.md?raw';
import { Card } from './ui';

// Estilos para renderizar el manual (MANUAL.md) con el look de la app.
const components: Components = {
  h1: () => null, // el título de la página lo ponemos nosotros
  h2: ({ children }) => (
    <h2 className="mb-2 mt-8 flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900 first:mt-0 dark:text-white">
      <span className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-5 text-sm font-extrabold text-slate-800 dark:text-slate-100">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-slate-800 dark:text-slate-100">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed marker:font-medium marker:text-indigo-500/70 dark:marker:text-indigo-400/70">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[13px] leading-relaxed text-amber-900 dark:border-amber-800/50 dark:bg-amber-500/10 dark:text-amber-100">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-indigo-600 dark:bg-slate-800 dark:text-indigo-300">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-slate-200 dark:border-slate-800" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 dark:bg-slate-800/60">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-slate-100 px-3.5 py-2.5 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
      {children}
    </td>
  ),
};

export default function Manual() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Manual de uso
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Guía paso a paso para usar Nexora: presupuestos, facturas, cobros y más.
        </p>
      </div>
      <Card className="p-5 sm:p-7">
        <div className="manual-content">
          <ReactMarkdown components={components}>{manualMd}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}
