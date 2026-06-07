export function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="inline-block rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
      {name}
    </span>
  );
}
