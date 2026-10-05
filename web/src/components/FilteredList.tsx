"use client";

/* A list with select filters and a search box whose values live in the query string, as the gaps
   and evidence views of site/app.js. The rows are rendered on the server; this component only
   chooses which to show. The static HTML holds the unfiltered list (the Suspense fallback), and the
   browser applies the query string once it hydrates. The words come from the server in the page
   language. */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useState, type ReactNode } from "react";

import { fill } from "@/i18n/core";

export interface Filter {
  name: string;
  label: string;
  options: [string, string][];
}

export interface FilterRow {
  id: string;
  /** The value of each filter for this row. */
  fields: Record<string, string>;
  /** Lowercase text the search box matches. */
  text: string;
  node: ReactNode;
}

interface ListProps {
  formId: string;
  countId: string;
  listId: string;
  filters: Filter[];
  placeholder: string;
  noun: string;
  empty: string;
  rows: FilterRow[];
  /** "All", "Search", "Clear" and the count template ("{shown} of {total} {noun}"). */
  words: { all: string; search: string; clear: string; count: string };
}

type Values = Record<string, string>;

function blank(filters: Filter[]): Values {
  return Object.fromEntries([...filters.map((f) => [f.name, ""]), ["q", ""]]);
}

function List({ initial, ...props }: ListProps & { initial: Values }) {
  const { formId, countId, listId, filters, placeholder, noun, empty, rows, words } = props;
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState<Values>(initial);

  const update = (next: Values) => {
    setValues(next);
    const query = new URLSearchParams(Object.entries(next).filter(([, v]) => v)).toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const q = values.q.trim().toLowerCase();
  const shown = rows.filter(
    (row) => filters.every((f) => !values[f.name] || row.fields[f.name] === values[f.name]) && (!q || row.text.includes(q)),
  );

  return (
    <>
      <form className="filters" id={formId} onSubmit={(e) => e.preventDefault()}>
        {filters.map((f) => (
          <label key={f.name}>
            {f.label}
            <select name={f.name} value={values[f.name]} onChange={(e) => update({ ...values, [f.name]: e.target.value })}>
              <option value="">{words.all}</option>
              {f.options.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          {words.search}
          <input
            type="search"
            name="q"
            value={values.q}
            placeholder={placeholder}
            onChange={(e) => update({ ...values, q: e.target.value })}
          />
        </label>
        <button type="button" className="reset" onClick={() => update(blank(filters))}>
          {words.clear}
        </button>
      </form>
      <div className="count" id={countId}>
        {fill(words.count, { shown: shown.length, total: rows.length, noun })}
      </div>
      <div className="stack" id={listId}>
        {shown.length ? (
          shown.map((row) => <Fragment key={row.id}>{row.node}</Fragment>)
        ) : (
          <p className="empty">{empty}</p>
        )}
      </div>
    </>
  );
}

function ListWithParams(props: ListProps) {
  const params = useSearchParams();
  const initial = blank(props.filters);
  props.filters.forEach((f) => {
    const value = params.get(f.name);
    if (value && f.options.some(([option]) => option === value)) initial[f.name] = value;
  });
  initial.q = params.get("q") ?? "";
  return <List {...props} initial={initial} />;
}

export function FilteredList(props: ListProps) {
  return (
    <Suspense fallback={<List {...props} initial={blank(props.filters)} />}>
      <ListWithParams {...props} />
    </Suspense>
  );
}
