"use client";

import { DatabaseProvider } from "./DatabaseContext";
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
  return (
    <div
      className="database-block"
      contentEditable={false}
      data-database-block
    >
      {isEditable && <DatabaseToolbar />}
      <DatabaseTable />
    </div>
  );
}
