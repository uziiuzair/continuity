"use client";

import { forwardRef } from "react";
import { BlockComponentProps, EditorBlock } from "./blocks/types";
import ParagraphBlock from "./blocks/ParagraphBlock";

export interface BlockRef {
  focus: () => void;
  getElement: () => HTMLElement | null;
}

interface BlockProps extends BlockComponentProps {
  ref?: React.Ref<BlockRef>;
}

/**
 * Block component - dispatches to the appropriate block type component
 */
const Block = forwardRef<BlockRef, BlockComponentProps>(function Block(
  props,
  ref
) {
  const { block } = props;

  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock ref={ref} {...props} />;

    // Future block types will be added here:
    // case "heading":
    //   return <HeadingBlock ref={ref} {...props} />;
    // case "bulletListItem":
    //   return <BulletListBlock ref={ref} {...props} />;
    // case "database":
    //   return <DatabaseBlock ref={ref} {...props} />;

    default:
      return (
        <div className="block-unknown p-2 text-gray-400 italic text-sm">
          Unknown block type: {block.type}
        </div>
      );
  }
});

export default Block;
