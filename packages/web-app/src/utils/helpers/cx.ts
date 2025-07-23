import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			shadow: [{ shadow: ["button", "input", "modal", "card", "highlight"] }],
		},
	},
});

export function cx(...classes: ClassValue[]) {
	return customTwMerge(clsx(...classes));
}
