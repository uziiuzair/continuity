import { CalloutIcon } from "@/components/icons/callout-icon";
import { DividerIcon } from "@/components/icons/divider-icon";
import { HeadingIcon } from "@/components/icons/heading-icon";
import { ListIcon } from "@/components/icons/list-icon";
import { ParagraphIcon } from "@/components/icons/paragraph-icon";
import { QuoteIcon } from "@/components/icons/quote-icon";
import { TableIcon } from "@/components/icons/table-icon";
import {
  Menu,
  MenuButton,
  MenuItem as HeadlessMenuItem,
  MenuItems,
} from "@headlessui/react";

interface AddDropdownProps {
  onAddBlock?: (type: string, props?: Record<string, unknown>) => void;
}

export const AddDropdown = ({ onAddBlock }: AddDropdownProps) => {
  const handleAddBlock = (type: string, props?: Record<string, unknown>) => {
    onAddBlock?.(type, props);
  };

  const menuitems = [
    {
      icon: <ParagraphIcon className="size-3" />,
      text: "Text",
      onClick: () => handleAddBlock("paragraph"),
    },
    {
      icon: <HeadingIcon className="size-3" />,
      text: "Heading 1",
      onClick: () => handleAddBlock("heading", { level: 1 }),
    },
    {
      icon: <HeadingIcon className="size-3" />,
      text: "Heading 2",
      onClick: () => handleAddBlock("heading", { level: 2 }),
    },
    {
      icon: <HeadingIcon className="size-3" />,
      text: "Heading 3",
      onClick: () => handleAddBlock("heading", { level: 3 }),
    },
    {
      icon: <ListIcon className="size-3" />,
      text: "Bulleted List",
      onClick: () => handleAddBlock("listItem", { listType: "bullet" }),
    },
    {
      icon: <ListIcon className="size-3" />,
      text: "Numbered List",
      onClick: () => handleAddBlock("listItem", { listType: "numbered" }),
    },
    {
      icon: <ListIcon className="size-3" />,
      text: "To-do List",
      onClick: () =>
        handleAddBlock("listItem", { listType: "todo", checked: false }),
    },
    {
      icon: <TableIcon className="size-3" />,
      text: "Database",
      onClick: () => handleAddBlock("database"),
    },
    // Future block types (not implemented yet)
    // {
    //   icon: <CalloutIcon className="size-3" />,
    //   text: "Callout",
    //   onClick: () => handleAddBlock("callout"),
    // },
    // {
    //   icon: <QuoteIcon className="size-3" />,
    //   text: "Quote",
    //   onClick: () => handleAddBlock("quote"),
    // },
    // {
    //   icon: <TableIcon className="size-3" />,
    //   text: "Table",
    //   onClick: () => handleAddBlock("table"),
    // },
    // {
    //   icon: <DividerIcon className="size-3" />,
    //   text: "Divider",
    //   onClick: () => handleAddBlock("divider"),
    // },
  ];

  return (
    <Menu as="div">
      <MenuButton as="button" className="add-block-btn" type="button">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </MenuButton>

      <MenuItems
        anchor="bottom start"
        className="z-50 mt-2.5 flex max-h-60 min-w-48 origin-top flex-col overflow-auto rounded-md bg-white/80 text-base shadow-lg backdrop-blur-sm transition duration-300 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0 sm:text-sm"
        transition
      >
        {menuitems.map((item, index) => (
          <MenuItem
            key={index}
            icon={item.icon}
            text={item.text}
            onClick={item.onClick}
          />
        ))}
      </MenuItems>
    </Menu>
  );
};

const MenuItem = ({
  icon,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}) => {
  return (
    <HeadlessMenuItem
      as="button"
      className="text-left flex items-center gap-2 text-sm py-1.5 px-2.5 hover:bg-[#f5f4ed] transition-all duration-300"
      onClick={onClick}
    >
      {icon}
      <span>{text}</span>
    </HeadlessMenuItem>
  );
};
