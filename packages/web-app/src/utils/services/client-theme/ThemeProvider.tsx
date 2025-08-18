import { useRouter } from "@tanstack/react-router";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { setThemeServerFn } from "./ui-theme.server";

export type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<
	[{ theme: Theme; isSystem: boolean }, (theme: Theme) => void] | undefined
>(undefined);

type ThemeProviderProps = {
	theme: Theme;
	children(props: { theme: Theme }): ReactNode;
};

export const ThemeProvider = (props: ThemeProviderProps) => {
	const _router = useRouter();
	const [theme, setThemeState] = useState<{
		theme: Theme;
		isSystem: boolean;
	}>(() => {
		if (props.theme === "system" && typeof window !== "undefined") {
			return {
				theme: window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light",
				isSystem: true,
			};
		}

		return {
			theme: props.theme,
			isSystem: false,
		};
	});

	const onSetTheme = useCallback(async (theme: Theme) => {
		document.body.classList.add("no-transition");

		// Call API to set theme cookie
		try {
			await setThemeServerFn({ data: { theme } });
		} catch (error) {
			console.error("Failed to set theme:", error);
		}

		setThemeState((_prev) => {
			if (theme === "system" && typeof window !== "undefined") {
				return {
					theme: window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light",
					isSystem: true,
				};
			}

			return {
				theme,
				isSystem: false,
			};
		});

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				document.body.classList.remove("no-transition");
			});
		});
	}, []);

	return (
		<ThemeContext.Provider value={[theme, onSetTheme]}>
			{props.children({ theme: theme.theme })}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}

	return context;
};
