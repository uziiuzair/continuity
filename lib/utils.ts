import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...classes: (string | undefined | false)[]) => {
  return clsx(twMerge(...classes));
};
