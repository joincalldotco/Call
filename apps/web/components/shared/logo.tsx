import { Icons } from "@call/ui/components/icons";

const Logo = () => {
  return (
    <h1 className="flex items-center gap-2 text-2xl font-bold">
      <Icons.logo className="size-6" />
      <span className="text-primary font-lora">Call</span>
    </h1>
  );
};

export default Logo;
