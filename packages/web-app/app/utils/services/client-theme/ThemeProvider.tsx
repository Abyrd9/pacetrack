import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSubmit } from "react-router";

export type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<
  [{ theme: Theme; isSystem: boolean }, (theme: Theme) => void] | undefined
>(undefined);

type ThemeProviderProps = {
  theme: Theme;
  children(props: { theme: Theme }): ReactNode;
};

export const ThemeProvider = (props: ThemeProviderProps) => {
  const submit = useSubmit();

  const [theme, setTheme] = useState<{
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

  const onSetTheme = useCallback(
    (theme: Theme) => {
      document.body.classList.add("no-transition");

      const form = new FormData();
      form.append("theme", theme);

      submit(form, {
        action: "/api/set-theme",
        method: "POST",
        navigate: false,
      });
      setTheme((prev) => {
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
    },
    [submit]
  );

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
