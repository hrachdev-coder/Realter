"use client";
import { formatDate } from "@/lib/i18n";

import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import { useCrm } from "./CrmProvider";
export default function Tasks({ leadId = "" }) {
  const { t: tr, locale } = useLocale();

  const { tasks, clients, leads, save, remove } = useCrm(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null);
  const blank = {
    title: "",
    description: "",
    due_date: new Date().toISOString().slice(0, 10),
    client_id: "",
    lead_id: leadId,
    completed: false,
  };
  const [value, setValue] = useState(blank);
  async function run(fn) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>{tr("Your next steps.")}</h1>
      <p style={{ margin: "12px 0 25px" }}>
        {tr("A little follow-through goes a long way.")}
      </p>
      <div className="split">
        <section className="panel">
          <h2>{tr("Follow-up tasks")}</h2>
          {tasks
            .toSorted(
              (a, b) =>
                Number(a.completed) - Number(b.completed) ||
                a.due_date.localeCompare(b.due_date),
            )
            .map((t) => (
              <div key={t.id} className="row">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    disabled={busy}
                    onChange={(e) =>
                      run(() =>
                        save(
                          "tasks",
                          {
                            ...t,
                            client_id: t.client_id || null,
                            lead_id: t.lead_id || null,
                            completed: e.target.checked,
                          },
                          t.id,
                        ),
                      )
                    }
                  />
                  <span
                    style={{
                      textDecoration: t.completed ? "line-through" : undefined,
                    }}
                  >
                    {t.title}
                    <small>
                      {formatDate(t.due_date, locale)}
                      {tr(" ")}
                      {t.client_id
                        ? "· " +
                          (clients.find((c) => c.id === t.client_id)
                            ?.full_name || "")
                        : ""}
                    </small>
                    <small>{t.description}</small>
                  </span>
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setEditing(t.id);
                      setValue({ ...blank, ...t });
                    }}
                  >
                    {tr("Edit")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm(tr("Delete this task?")))
                        run(() => remove("tasks", t.id));
                    }}
                  >
                    {tr("Delete")}
                  </button>
                </div>
              </div>
            ))}
          {!tasks.length && (
            <div className="empty">
              {tr("No tasks yet. Plan your next follow-up.")}
            </div>
          )}
        </section>
        <form
          className="panel form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await save(
                "tasks",
                {
                  ...value,
                  client_id: value.client_id || null,
                  lead_id: value.lead_id || null,
                },
                editing,
              );
              setValue(blank);
              setEditing(null);
              setMessage("Task saved.");
            });
          }}
        >
          <h2>{tr(editing ? "Edit task" : "Add a task")}</h2>
          <label>
            {tr("Title")}
            <input
              required
              minLength={2}
              maxLength={200}
              value={value.title}
              onChange={(e) => setValue({ ...value, title: e.target.value })}
            />
          </label>
          <label>
            {tr("Description")}
            <textarea
              value={value.description}
              onChange={(e) =>
                setValue({ ...value, description: e.target.value })
              }
            />
          </label>
          <label>
            {tr("Due date")}
            <input
              type="date"
              required
              value={value.due_date}
              onChange={(e) => setValue({ ...value, due_date: e.target.value })}
            />
          </label>
          <label>
            {tr("Client (optional)")}
            <select
              value={value.client_id || ""}
              onChange={(e) =>
                setValue({ ...value, client_id: e.target.value })
              }
            >
              <option value="">{tr("No client")}</option>
              {clients.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr("Lead (optional)")}
            <select
              value={value.lead_id || ""}
              onChange={(e) => setValue({ ...value, lead_id: e.target.value })}
            >
              <option value="">{tr("No lead")}</option>
              {leads.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button" disabled={busy}>
            {tr(busy ? "Saving…" : "Save task")}
          </button>
          {editing && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setEditing(null);
                setValue(blank);
              }}
            >
              {tr("Cancel edit")}
            </button>
          )}
          {message && (
            <div className="notice" role="status">
              {tr(message)}
            </div>
          )}
        </form>
      </div>
    </>
  );
}
