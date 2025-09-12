import { useMounted } from "./use-mouted";

export const useOrigin = () => {
  const mounted = useMounted();

  if (!mounted) return "";

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "";

  return origin;
};
