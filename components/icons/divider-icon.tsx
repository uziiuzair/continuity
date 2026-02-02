import { cn } from "@/lib/utils";

export const DividerIcon = (props: React.SVGProps<SVGSVGElement>) => {
  const { className, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 32 32"
      className={cn("rotate-90", className)}
      {...rest}
    >
      <path fill="currentColor" d="M17 3v26a1 1 0 0 1-2 0V3a1 1 0 0 1 2 0" />
    </svg>
  );
};
