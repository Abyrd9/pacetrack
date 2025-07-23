import { Image } from "@unpic/react";
import Dark404 from "~/assets/dark-404.svg";
import Dark500 from "~/assets/dark-500.svg";
import DarkEmpty from "~/assets/dark-empty.svg";
import Light404 from "~/assets/light-404.svg";
import Light500 from "~/assets/light-500.svg";
import LightEmpty from "~/assets/light-empty.svg";
import { useTheme } from "~/utils/services/client-theme/ThemeProvider";

export function UhOhImage({
	image = "empty",
	className,
}: {
	image?: "404" | "500" | "empty";
	className?: string;
}) {
	const [{ theme }] = useTheme();

	if (image === "404") {
		return (
			<Image
				src={theme === "light" ? Light404 : Dark404}
				alt="Uh Oh"
				width={220}
				height={150}
				className={className}
			/>
		);
	}

	if (image === "500") {
		return (
			<Image
				src={theme === "light" ? Light500 : Dark500}
				alt="Uh Oh"
				width={220}
				height={150}
				className={className}
			/>
		);
	}

	return (
		<Image
			src={theme === "light" ? LightEmpty : DarkEmpty}
			alt="Uh Oh"
			width={220}
			height={150}
			className={className}
		/>
	);
}
