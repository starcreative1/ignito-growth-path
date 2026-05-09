import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
  children?: ReactNode;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = "",
  children,
}: EmptyStateProps) => {
  const ActionIcon = action?.icon;
  return (
    <Card className={`border-dashed shadow-subtle bg-muted/30 ${className}`}>
      <CardContent className="flex flex-col items-center text-center px-6 py-14 sm:py-16">
        <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center shadow-subtle mb-5 ring-1 ring-border">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold tracking-tight mb-1.5">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
        )}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            {action && (
              <Button onClick={action.onClick} className="shadow-subtle">
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="ghost" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
        {children && <div className="mt-6 w-full">{children}</div>}
      </CardContent>
    </Card>
  );
};