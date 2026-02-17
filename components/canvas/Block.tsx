"use client";

import { forwardRef } from "react";
import { BlockComponentProps, EditorBlock } from "./blocks/types";
import ParagraphBlock from "./blocks/ParagraphBlock";
import HeadingBlock from "./blocks/HeadingBlock";
import ListItemBlock from "./blocks/ListItemBlock";
import DatabaseBlockWrapper from "./blocks/DatabaseBlockWrapper";
import CodeBlock from "./blocks/CodeBlock";
import ChartBlock from "./blocks/ChartBlock";
import ColumnsBlock from "./blocks/ColumnsBlock";

export interface BlockRef {
  focus: () => void;
  getElement: () => HTMLElement | null;
}

interface BlockProps extends BlockComponentProps {
  ref?: React.Ref<BlockRef>;
  listPosition?: number;
  allBlocks?: EditorBlock[];
}

/**
 * Block component - dispatches to the appropriate block type component
 */
const Block = forwardRef<BlockRef, BlockProps>(function Block(props, ref) {
  const { block, listPosition, allBlocks, ...restProps } = props;

  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock ref={ref} block={block} {...restProps} />;

    case "heading":
      return <HeadingBlock ref={ref} block={block} {...restProps} />;

    case "listItem":
      return (
        <ListItemBlock
          ref={ref}
          block={block}
          listPosition={listPosition}
          {...restProps}
        />
      );

    case "database":
      return (
        <DatabaseBlockWrapper
          ref={ref}
          block={block}
          {...restProps}
        />
      );

    case "code":
      return <CodeBlock ref={ref} block={block} {...restProps} />;

    case "chart":
      return (
        <ChartBlock
          ref={ref}
          block={block}
          allBlocks={allBlocks}
          {...restProps}
        />
      );

    case "columns":
      return <ColumnsBlock ref={ref} block={block} {...restProps} />;

    default:
      return (
        <div className="block-unknown p-2 text-gray-400 italic text-sm">
          Unknown block type: {block.type}
        </div>
      );
  }
});

export default Block;
