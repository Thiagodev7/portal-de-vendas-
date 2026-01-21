import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes CSS resolvendo conflitos do Tailwind.
 * Ex: cn("bg-red-500", props.className) -> garante que a classe final vença.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}