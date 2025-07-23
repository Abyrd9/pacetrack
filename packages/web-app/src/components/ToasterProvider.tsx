import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "~/components/primitives/button";
import {
	ToastProvider as RadixToastProvider,
	ToastClose as ToastItemClose,
	ToastDescription as ToastItemDescription,
	Toast as ToastItemRoot,
	ToastTitle as ToastItemTitle,
	ToastViewport,
} from "~/components/primitives/toast";

export type ToastVariant = "default" | "destructive";

export type ToastInput = {
	id?: string;
	title?: string;
	description?: string;
	variant?: ToastVariant;
	duration?: number; // ms, defaults to 4000
};

export type ToastInstance = {
	id: string;
	title: string;
	description: string;
	variant: ToastVariant;
	duration: number;
	open: boolean;
};

export type ToastAPI = {
	push: (toast: ToastInput) => string; // returns id
	success: (
		title: string,
		description?: string,
		opts?: Omit<ToastInput, "title" | "description" | "variant">,
	) => string;
	error: (
		title: string,
		description?: string,
		opts?: Omit<ToastInput, "title" | "description" | "variant">,
	) => string;
	dismiss: (id?: string) => void; // dismiss one or all
};

// In-memory singleton wiring so callers can do `toast.push(...)` outside React
const pendingEnqueues: ToastInput[] = [];
let enqueueRef: ToastAPI["push"] | null = null;
let dismissRef: ToastAPI["dismiss"] | null = null;

export const toast: ToastAPI = {
	push: (t) => {
		if (enqueueRef) return enqueueRef(t);
		pendingEnqueues.push(t);
		// Return a generated id even if not mounted yet for parity
		return t.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	},
	success: (title, description, opts) =>
		toast.push({ title, description, variant: "default", ...opts }),
	error: (title, description, opts) =>
		toast.push({ title, description, variant: "destructive", ...opts }),
	dismiss: (id) => {
		if (dismissRef) return dismissRef(id);
		// If not mounted yet, drop no-op
	},
};

// React context for consumption via hook
const ToastContext = createContext<ToastAPI | null>(null);
export const useToast = () => {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within <AppToaster />");
	return ctx;
};

// The mounted manager which integrates Radix provider and renders queued toasts
export function ToasterProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastInstance[]>([]);
	const toastsRef = useRef(toasts);
	toastsRef.current = toasts;
	const timersRef = useRef(new Map<string, number>());
	const progressStartRef = useRef(new Map<string, number>());
	const elapsedRef = useRef(new Map<string, number>());
	const ANIMATION_MS = 150;
	const MAX_TOASTS = 10;

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const api = useMemo<ToastAPI>(
		() => ({
			push: (input) => {
				// Enforce max concurrent toasts by removing oldest beyond cap
				if (toastsRef.current.length >= MAX_TOASTS) {
					const oldest = toastsRef.current[0];
					if (oldest) {
						const existing = timersRef.current.get(oldest.id);
						if (existing) {
							window.clearTimeout(existing);
							timersRef.current.delete(oldest.id);
						}
						removeToast(oldest.id);
					}
				}

				const id =
					input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
				const next: ToastInstance = {
					id,
					title: input.title ?? "",
					description: input.description ?? "",
					variant: input.variant ?? "default",
					duration: input.duration ?? 4000,
					open: true,
				};
				setToasts((prev) => [...prev, next]);
				// auto-dismiss after duration
				progressStartRef.current.set(id, performance.now());
				const timer = window.setTimeout(() => {
					api.dismiss(id);
				}, next.duration);
				timersRef.current.set(id, timer);
				return id;
			},
			success: (title, description, opts) =>
				toast.push({ title, description, variant: "default", ...opts }),
			error: (title, description, opts) =>
				toast.push({ title, description, variant: "destructive", ...opts }),
			dismiss: (id) => {
				if (!id) {
					// dismiss all
					const current = toastsRef.current;
					setToasts((prev) => prev.map((t) => ({ ...t, open: false })));
					for (const t of current) {
						const existing = timersRef.current.get(t.id);
						if (existing) {
							window.clearTimeout(existing);
							timersRef.current.delete(t.id);
						}
						// capture elapsed for progress bar
						const start = progressStartRef.current.get(t.id);
						if (start) {
							const elapsed = performance.now() - start;
							elapsedRef.current.set(t.id, elapsed);
						}
						const removalTimer = window.setTimeout(
							() => removeToast(t.id),
							ANIMATION_MS,
						);
						timersRef.current.set(
							`rm:${t.id}`,
							removalTimer as unknown as number,
						);
					}
					return;
				}
				setToasts((prev) =>
					prev.map((t) => (t.id === id ? { ...t, open: false } : t)),
				);
				const existing = timersRef.current.get(id);
				if (existing) {
					window.clearTimeout(existing);
					timersRef.current.delete(id);
				}
				// capture elapsed for progress bar
				const start = progressStartRef.current.get(id);
				if (start) {
					const elapsed = performance.now() - start;
					elapsedRef.current.set(id, elapsed);
				}
				const removalTimer = window.setTimeout(
					() => removeToast(id),
					ANIMATION_MS,
				);
				timersRef.current.set(`rm:${id}`, removalTimer as unknown as number);
			},
		}),
		[removeToast],
	);

	// Wire up global singleton handlers on mount
	useEffect(() => {
		enqueueRef = api.push;
		dismissRef = api.dismiss;

		// Flush pending items queued before mount
		if (pendingEnqueues.length) {
			for (const item of pendingEnqueues.splice(0)) api.push(item);
		}

		return () => {
			enqueueRef = null;
			dismissRef = null;
		};
	}, [api.push, api.dismiss]);

	// Render
	return (
		<ToastContext.Provider value={api}>
			<RadixToastProvider>
				{children}
				{toasts.map((t) => (
					<ToastItemRoot
						key={t.id}
						open={t.open}
						onOpenChange={(open) => {
							if (!open) {
								// Start close, then remove after animation
								setToasts((prev) =>
									prev.map((x) => (x.id === t.id ? { ...x, open: false } : x)),
								);
								const removalTimer = window.setTimeout(
									() => removeToast(t.id),
									ANIMATION_MS,
								);
								timersRef.current.set(
									`rm:${t.id}`,
									removalTimer as unknown as number,
								);
							}
						}}
						onEscapeKeyDown={() => api.dismiss(t.id)}
						onSwipeEnd={() => api.dismiss(t.id)}
						variant={t.variant}
					>
						<div className="flex-1">
							{t.title ? <ToastItemTitle>{t.title}</ToastItemTitle> : null}
							{t.description ? (
								<ToastItemDescription>{t.description}</ToastItemDescription>
							) : null}
							<div className="top-0 left-0 absolute h-1 w-full origin-left rounded-sm bg-foreground/10">
								<div
									className="absolute top-0 left-0 h-full w-full rounded-sm bg-blue-300 animate-[toast-progress]"
									style={{
										animationTimingFunction: "linear",
										animationDuration: `${t.duration}ms`,
									}}
								/>
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => api.dismiss(t.id)}
							className="shrink-0"
						>
							Clear
						</Button>
						<ToastItemClose />
					</ToastItemRoot>
				))}
				<ToastViewport className="space-y-3" />
			</RadixToastProvider>
		</ToastContext.Provider>
	);
}
