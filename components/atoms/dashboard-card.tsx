export const DashboardCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="p-5 bg-[#f7f6f2] border border-(--border-color)/50 rounded-xl w-full h-fit">
      {children}
    </div>
  );
};
