import Alert from "../ui/alert";

export default function Heading(props: {
  title: string;
  description: string;
  errorMessage?: string | null;
  action?: React.ReactNode;
}) {
  const { title, description, errorMessage, action } = props;
  return (
    <div className="flex flex-col px-4 sm:px-6 py-4 gap-4">
      <div className="w-full max-w-screen-2xl mx-auto flex gap-4 justify-between items-end flex-col sm:flex-row">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm text-foreground/60 leading-relaxed text-balance">
            {description}
          </p>
        </div>

        {action && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 md:relative md:left-auto md:bottom-auto md:translate-x-0">
            {action}
          </div>
        )}
      </div>

      {/* Error banner if any */}
      {errorMessage && (
        <Alert
          variant="error"
          description={errorMessage}
          className="w-full max-w-screen-2xl mx-auto rounded-xl p-4 text-xs font-semibold"
        />
      )}
    </div>
  );
}
