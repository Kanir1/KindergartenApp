// src/components/ReportCard.jsx
import { Link } from 'react-router-dom';

function truncate(s, n = 90) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export default function ReportCard({ item, variant = 'daily' }) {
  const isDaily = variant === 'daily';
  const date = isDaily
    ? (item.date ? new Date(item.date).toLocaleDateString() : '')
    : (item.month || '');
  const typeLabel = isDaily
    ? (item.type === 'postSleep' ? 'Post-sleep' : 'Pre-sleep')
    : 'Monthly';
  const childName = item.child?.name || '—';
  const photos = Array.isArray(item.photos) ? item.photos : [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-[13px] shadow-sm transition hover:shadow-md hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-slate-800">
          {date} • {typeLabel}
        </h3>
        <div className="shrink-0 text-xs text-slate-500">{childName}</div>
      </div>

      <div className="mt-2 space-y-1 leading-5 text-slate-700">
        {isDaily ? (
          <>
            {item.meals && (item.meals.breakfast || item.meals.lunch || item.meals.snack) && (
              <div>
                <span className="text-slate-500">Meals:</span>{' '}
                {[
                  item.meals.breakfast && `B: ${item.meals.breakfast}`,
                  item.meals.lunch && `L: ${item.meals.lunch}`,
                  item.meals.snack && `S: ${item.meals.snack}`,
                ].filter(Boolean).join(' • ')}
              </div>
            )}
            {item.hydration && (
              <div>
                <span className="text-slate-500">Hydration:</span>{' '}
                {item.hydration.status || '—'}
                {item.hydration.cups !== undefined ? ` (${item.hydration.cups} cups)` : ''}
              </div>
            )}
            {item.type === 'postSleep' && item.sleep && (item.sleep.start || item.sleep.end) && (
              <div>
                <span className="text-slate-500">Sleep:</span>{' '}
                {item.sleep.minutes !== undefined ? `${item.sleep.minutes} min` : '—'}
              </div>
            )}
            {item.notes && (
              <div>
                <span className="text-slate-500">Notes:</span> {truncate(item.notes, 80)}
              </div>
            )}
          </>
        ) : (
          <>
            {item.summary && (
              <div>
                <span className="text-slate-500">Summary:</span> {truncate(item.summary, 90)}
              </div>
            )}
            {Array.isArray(item.milestones) && item.milestones.length > 0 && (
              <div>
                <span className="text-slate-500">Milestones:</span>{' '}
                {truncate(item.milestones.join(', '), 90)}
              </div>
            )}
          </>
        )}
      </div>

      {!!photos.length && (
        <div className="mt-2 flex gap-2 overflow-hidden">
          {photos.slice(0, 2).map((p, i) => {
            const url = typeof p === 'string' ? p : p?.url;
            if (!url) return null;
            return <img key={i} src={url} alt="" className="h-16 w-24 rounded object-cover" />;
          })}
        </div>
      )}

      <div className="mt-3">
        <Link
          to={`/reports/${isDaily ? 'daily' : 'monthly'}/${item._id}`}
          className="inline-flex rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          View
        </Link>
      </div>
    </div>
  );
}
