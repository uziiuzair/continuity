"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

// Our <Editor> component we can reuse later
export default function Editor() {
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: "Open up a menu or toolbar to see more of the red theme",
      },
      {
        type: "paragraph",
        content:
          "Toggle light/dark mode in the page footer and see the theme change too",
      },
      {
        type: "paragraph",
      },
    ],
  });

  return <BlockNoteView editor={editor} theme="light" />;
}
