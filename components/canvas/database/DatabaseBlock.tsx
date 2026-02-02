"use client";

import { DatabaseProvider, useDatabase } from "./DatabaseContext";
import { DatabaseToolbar } from "./DatabaseToolbar";
import { DatabaseTable } from "./DatabaseTable";
import { DatabaseBlockData } from "@/lib/canvas/database/types";

interface DatabaseBlockProps {
  data: DatabaseBlockData;
  onUpdate: (data: DatabaseBlockData) => void;
  isEditable?: boolean;
}

export default function DatabaseBlockWrapper({
  data,
  onUpdate,
  isEditable = true,
}: DatabaseBlockProps) {
  return (
    <DatabaseProvider data={data} onUpdate={onUpdate}>
      <DatabaseBlockContent isEditable={isEditable} />
    </DatabaseProvider>
  );
}

function DatabaseBlockContent({ isEditable }: { isEditable: boolean }) {
  const { addColumn } = useDatabase();

  const handleAddColumn = (name: string, type: string) => {
    addColumn({ name, type: type as "text" | "number" | "select" | "multiselect" | "date" | "time" | "status" });
  };

  return (
    <div
      className="database-block"
      contentEditable={false}
      data-database-block
    >
      {isEditable && <DatabaseToolbar onAddColumn={handleAddColumn} />}
      <DatabaseTable />
    </div>
  );
}
