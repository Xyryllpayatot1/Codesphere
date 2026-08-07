"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

export function ProfileTabs({
  overview,
  titles,
  settings,
}: {
  overview: React.ReactNode;
  titles?: React.ReactNode;
  settings: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("tab") ?? "overview");

  function change(next: string) {
    setValue(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    router.replace(`/profile${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const tabList = [
    { value: "overview", label: "Overview" },
    ...(titles ? [{ value: "titles", label: "Titles" }] : []),
    { value: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={value} onValueChange={change} tabs={tabList} />
      {value === "overview" ? overview : value === "titles" && titles ? titles : settings}
    </div>
  );
}
