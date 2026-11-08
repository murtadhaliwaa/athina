"use client";

import { PageHeader } from "@/components/shared/page-header";

export function WaiterPageHeader({
  title,
  subtitle,
  statusOk,
}: {
  title: string;
  subtitle: string;
  statusOk?: boolean;
}) {
  return (
    <PageHeader title={title} subtitle={subtitle} statusOk={statusOk} />
  );
}
