/** Share an in-flight read; callers can await it instead of leaving loading states stranded. */
export function singleFlight(task) {
  const pending=new Map();
  return (...args) => {
    const key=JSON.stringify(args);
    if(pending.has(key))return pending.get(key);
    const request=Promise.resolve().then(()=>task(...args)).finally(()=>{if(pending.get(key)===request)pending.delete(key);});
    pending.set(key,request);return request;
  };
}

/** Keep clickable rows in place when only short-lived photo URLs have changed. */
export function stableList(container, items, {key, signature, create, update}) {
  const existing = new Map(Array.from(container.children).filter(el => el.dataset?.rowKey).map(el => [el.dataset.rowKey, el]));
  const rows = items.map(item => {
    const id = String(key(item)), value = signature(item);
    let row = existing.get(id);
    if (!row || row.dataset.rowSignature !== value) row = create(item);
    row.dataset.rowKey = id; row.dataset.rowSignature = value;
    update?.(row, item);
    return row;
  });
  const retained=new Set(rows);
  for (const child of Array.from(container.children)) if (!retained.has(child)) child.remove();
  rows.forEach((row, index) => { if (container.children[index] !== row) container.insertBefore(row, container.children[index] || null); });
}
