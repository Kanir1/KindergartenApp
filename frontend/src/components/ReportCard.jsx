// src/components/ReportCard.jsx
export default function ReportCard({ item, variant = 'daily' }) {
  if (variant === 'daily') {
    const t = item.type === 'preSleep' ? 'Pre-sleep' : 'Post-sleep';
    const meals = item.meals || {};
    const hydration = item.hydration || {};
    const sleep = item.sleep || {};
    const photos = Array.isArray(item.photos) ? item.photos : [];

    const photoUrl = (p) => (typeof p === 'string' ? p : p?.url);

    return (
      <div className="border rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">{item.date} • {t}</div>
        </div>

        {(meals.breakfast || meals.lunch || meals.snack) && (
          <div className="text-sm">
            <div><span className="opacity-70">Breakfast:</span> {meals.breakfast || '—'}</div>
            <div><span className="opacity-70">Lunch:</span> {meals.lunch || '—'}</div>
            <div><span className="opacity-70">Snack:</span> {meals.snack || '—'}</div>
          </div>
        )}

        {(hydration.status || hydration.cups !== undefined) && (
          <div className="text-sm">
            <span className="opacity-70">Hydration:</span> {hydration.status || '—'}
            {hydration.cups !== undefined ? ` (${hydration.cups} cups)` : ''}
          </div>
        )}

        {item.type === 'postSleep' && (sleep.start || sleep.end || sleep.minutes !== undefined) && (
          <div className="text-sm">
            <span className="opacity-70">Sleep:</span>{' '}
            {sleep.start ? new Date(sleep.start).toLocaleString() : '—'} →{' '}
            {sleep.end ? new Date(sleep.end).toLocaleString() : '—'}
            {sleep.minutes !== undefined ? ` (${sleep.minutes} min)` : ''}
          </div>
        )}

        {item.notes && (
          <div className="text-sm">
            <span className="opacity-70">Notes:</span> {item.notes}
          </div>
        )}

        {!!photos.length && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {photos.map((p, i) => {
              const url = photoUrl(p);
              if (!url) return null;
              return <img key={i} src={url} alt="report" className="w-full h-24 object-cover rounded" />;
            })}
          </div>
        )}
      </div>
    );
  }

  // monthly
  const milestones = Array.isArray(item.milestones) ? item.milestones : [];
  return (
    <div className="border rounded p-3 space-y-2">
      <div className="font-medium">{item.month}</div>

      {item.summary && (
        <div className="text-sm"><span className="opacity-70">Summary:</span> {item.summary}</div>
      )}

      {!!milestones.length && (
        <div className="text-sm">
          <span className="opacity-70">Milestones:</span>
          <ul className="list-disc pl-5">
            {milestones.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {item.mealsOverview && (
        <div className="text-sm"><span className="opacity-70">Meals:</span> {item.mealsOverview}</div>
      )}
      {item.sleepOverview && (
        <div className="text-sm"><span className="opacity-70">Sleep:</span> {item.sleepOverview}</div>
      )}
      {item.hydrationOverview && (
        <div className="text-sm"><span className="opacity-70">Hydration:</span> {item.hydrationOverview}</div>
      )}
      {item.notes && (
        <div className="text-sm"><span className="opacity-70">Notes:</span> {item.notes}</div>
      )}
    </div>
  );
}
