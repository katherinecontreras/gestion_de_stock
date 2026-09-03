export function PageHeader({ title, description, actions }) {
    return (<header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-app-primary">{title}</h1>
        {description ? (<p className="mt-1 max-w-3xl text-sm text-app-mutedtext">{description}</p>) : null}
      </div>
      {actions ? (<div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
          {actions}
        </div>) : null}
    </header>);
}
