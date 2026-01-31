"use client";

import { useState, useEffect } from "react";
import { isTauriContext } from "@/lib/db";
import {
  initializeSchema,
  createItem,
  getAllItems,
  deleteItem,
  TestItem,
} from "@/lib/db-service";

export default function DbTest() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    async function init() {
      // Check if we're in Tauri context
      const inTauri = isTauriContext();
      setIsTauri(inTauri);

      if (!inTauri) {
        setLoading(false);
        return;
      }

      try {
        await initializeSchema();
        const allItems = await getAllItems();
        setItems(allItems);
      } catch (err) {
        console.error("DB init error:", err);
        setError(err instanceof Error ? err.message : JSON.stringify(err));
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  async function handleAdd() {
    if (!input.trim()) return;

    try {
      await createItem(input.trim());
      const allItems = await getAllItems();
      setItems(allItems);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteItem(id);
      const allItems = await getAllItems();
      setItems(allItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  if (!isTauri) {
    return (
      <div style={{ padding: "20px", fontFamily: "system-ui" }}>
        <h1 style={{ marginBottom: "16px" }}>SQLite Test</h1>
        <p style={{ color: "#666" }}>
          Not running in Tauri context. Run with <code>npm run tauri dev</code>{" "}
          to test database operations.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", fontFamily: "system-ui" }}>
        <h1 style={{ marginBottom: "16px" }}>SQLite Test</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", fontFamily: "system-ui" }}>
        <h1 style={{ marginBottom: "16px" }}>SQLite Test</h1>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "20px", fontFamily: "system-ui", maxWidth: "600px" }}
    >
      <h1 style={{ marginBottom: "16px" }}>SQLite Test</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Enter item content..."
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "#666" }}>No items yet. Add one above!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                marginBottom: "8px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{item.content}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {item.created_at}
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  backgroundColor: "#ff4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
