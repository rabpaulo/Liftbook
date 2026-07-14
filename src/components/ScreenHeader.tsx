import { ReactNode } from "react";

import { LiquidHeader } from "@/components/LiquidHeader";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, showBack = false, right }: ScreenHeaderProps) {
  return <LiquidHeader title={title} subtitle={subtitle} showBack={showBack} right={right} />;
}
