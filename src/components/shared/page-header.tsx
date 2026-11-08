"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type PageHeaderContent = {
  title: string;
  subtitle?: string;
  statusOk?: boolean;
};

type PageHeaderContextValue = {
  content: PageHeaderContent | null;
  setContent: (value: PageHeaderContent | null) => void;
  actionsEl: HTMLElement | null;
  setActionsEl: (el: HTMLElement | null) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<PageHeaderContent | null>(null);
  const [actionsEl, setActionsEl] = useState<HTMLElement | null>(null);
  const value = useMemo(
    () => ({ content, setContent, actionsEl, setActionsEl }),
    [content, actionsEl],
  );
  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeaderContent() {
  return useContext(PageHeaderContext)?.content ?? null;
}

export function usePageHeaderActionsSlot() {
  const ctx = useContext(PageHeaderContext);
  return ctx?.setActionsEl ?? null;
}

/** يضع العنوان في الشريط العلوي بجانب الأزرار — بدون صف فارغ فوقه */
export function PageHeader({
  title,
  subtitle,
  statusOk,
}: {
  title: string;
  subtitle?: string;
  /** إن وُجدت تُظهر نقطة الحالة بجانب العنوان الفرعي */
  statusOk?: boolean;
}) {
  const ctx = useContext(PageHeaderContext);
  const setContent = ctx?.setContent;
  useLayoutEffect(() => {
    if (!setContent) return;
    setContent({ title, subtitle, statusOk });
    return () => setContent(null);
  }, [setContent, title, subtitle, statusOk]);
  return null;
}

/** أزرار إضافية بجانب الثيم/الخروج — لا تُرسم فوق العنوان */
export function PageHeaderActions({ children }: { children: ReactNode }) {
  const ctx = useContext(PageHeaderContext);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!mounted || !ctx?.actionsEl) return null;
  return createPortal(children, ctx.actionsEl);
}

export function PageHeaderTitleBlock({
  content,
  className,
}: {
  content: PageHeaderContent;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 text-start", className)}>
      <h1 className="truncate text-2xl leading-tight font-bold tracking-tight">
        {content.title}
      </h1>
      {content.subtitle ? (
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
          {typeof content.statusOk === "boolean" ? (
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                content.statusOk ? "bg-emerald-500" : "bg-destructive",
              )}
              aria-hidden
            />
          ) : null}
          <span className="min-w-0 truncate">{content.subtitle}</span>
        </div>
      ) : null}
    </div>
  );
}
