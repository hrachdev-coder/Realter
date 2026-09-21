"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { schemas } from "@/lib/validation";
const Context = createContext(null);
export const useCrm = () => useContext(Context);
export function CrmProvider({ initial, demo, user, children }) {
  const [data, setData] = useState(initial);
  useEffect(() => setData(initial), [initial]);
  async function save(entity, values, id) {
    const checked = schemas[entity].safeParse(values);
    if (!checked.success) throw new Error(checked.error.issues[0].message);
    values = checked.data;
    let record;
    if (demo) {
      record = {
        ...values,
        id: id || crypto.randomUUID(),
        realtor_id: "demo",
        created_at: new Date().toISOString(),
      };
      if (entity === "leads")
        record = { ...data.leads.find((x) => x.id === id), ...record };
    } else {
      const response = await fetch("/api/crm/" + entity, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", id, values }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      record = result.data;
    }
    setData((current) =>
      entity === "profiles"
        ? { ...current, profile: record }
        : {
            ...current,
            [entity]: id
              ? current[entity].map((x) => (x.id === id ? record : x))
              : [record, ...current[entity]],
          },
    );
    return record;
  }
  async function remove(entity, id) {
    if (!demo) {
      const response = await fetch("/api/crm/" + entity, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
    }
    setData((current) => ({
      ...current,
      [entity]: current[entity].filter((x) => x.id !== id),
      ...(entity === "properties"
        ? {
            leads: current.leads.map((l) =>
              l.property_id === id ? { ...l, property_id: null } : l,
            ),
          }
        : {}),
      ...(entity === "clients"
        ? {
            tasks: current.tasks.map((t) =>
              t.client_id === id ? { ...t, client_id: null } : t,
            ),
          }
        : {}),
    }));
  }
  return (
    <Context.Provider value={{ ...data, demo, user, save, remove }}>
      {children}
    </Context.Provider>
  );
}
