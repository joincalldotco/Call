import type { Metadata } from "next";
import SideBar from "@/components/app/sideBar";

export const metadata: Metadata = {
  title: "App",
  description: "App",
};

const Page = () => {
  return (
    <div className="w-full min-h-screen bg-[#101010] flex">
      {/* Sidebar */}
      <aside className="w-1/6 bg-[#101010]">
        <SideBar />
      </aside>
      {/* Dashboard */}
      <main className="border"></main>
    </div>
  );
};

export default Page;
