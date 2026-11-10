export default function Heading(props: {
  title: string;
  description: string;
  errorMessage?: string | null;
  action?: React.ReactNode;
}) {
  const { title, description, errorMessage, action } = props;
  return (
    <div className="flex flex-col px-4 sm:px-6 py-4 gap-4">
      <div className="w-full max-w-screen-2xl mx-auto flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm text-foreground/60 leading-relaxed">
            {description}
          </p>
        </div>
        {action}
      </div>

      {/* Error banner if any */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400 w-full max-w-screen-2xl mx-auto">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
