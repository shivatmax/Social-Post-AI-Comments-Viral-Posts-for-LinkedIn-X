interface SectionTitleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionTitle({ title, description, action }: SectionTitleProps) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
