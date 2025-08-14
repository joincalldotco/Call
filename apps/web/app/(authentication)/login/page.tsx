"use client";

import SocialButton from "@/components/auth/social-button";
import Logo from "@/components/shared/logo";

const Page = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex w-full max-w-sm flex-col items-center justify-center gap-6 px-4">
        <Logo />
        <div>
          <SocialButton />
        </div>
      </div>
    </div>
  );
};

export default Page;
