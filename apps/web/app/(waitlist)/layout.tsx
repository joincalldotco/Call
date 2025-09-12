import React from "react";
import Navbar from "./_components/navbar";
import Footer from "./_components/footer";

const MarkdownLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <main className="bg-muted dark:bg-background relative z-0 flex min-h-screen flex-col gap-20">
        <Navbar />
        {children}
        <Footer />
      </main>
    </>
  );
};

export default MarkdownLayout;
