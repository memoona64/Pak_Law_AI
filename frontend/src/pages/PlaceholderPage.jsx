// Shared blank placeholder shown for every route until its real screen is ported.
export default function PlaceholderPage({ title }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-espresso">
      <h1 className="font-serif text-2xl">{title}</h1>
    </div>
  )
}
