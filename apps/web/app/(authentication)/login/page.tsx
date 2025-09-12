"use client";

import SocialButton from "@/components/auth/social-button";
import Logo from "@/components/shared/logo";

const Page = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-6 w-full max-w-sm px-4">
        <Logo />
        <div >
          <SocialButton />
        </div>
      </div>
    </div>
  );
};

export default Page;
