export const ParagraphIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="2"
        d="M12 22.5v-21m-1.91 21h3.82m7.64-19.09V1.5H2.46v1.91"
      />
    </svg>
  );
};
