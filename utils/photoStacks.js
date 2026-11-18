/**
 * Groups individual photo rows from `public.photos` into Album Stacks.
 * - Photos uploaded together share `title` formatted as `stack_<timestamp>|<Album Title>`
 * - Within each stack, photos are ordered by `order_index ASC, id ASC` so #1 is the cover photo.
 */
function groupPhotosIntoStacks(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Sort by order_index ASC first, then id ASC so custom photo ordering & cover selection work
  const sorted = [...rows].sort((a, b) => {
    const oa = Number(a.order_index) || 0;
    const ob = Number(b.order_index) || 0;
    if (oa !== ob) return oa - ob;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  const stackMap = new Map();
  let autoBatchCounter = 0;
  let lastLegacyByCat = {};

  for (const row of sorted) {
    const rawTitle = String(row.title || '').trim();
    const cat = row.category || 'wedding';
    let stackKey = '';
    let albumTitle = '';

    if (rawTitle.startsWith('stack_')) {
      const pipeIdx = rawTitle.indexOf('|');
      if (pipeIdx !== -1) {
        stackKey = rawTitle.slice(0, pipeIdx);
        albumTitle = rawTitle.slice(pipeIdx + 1).trim();
      } else {
        stackKey = rawTitle;
      }
    } else if (rawTitle) {
      stackKey = `title_${cat}_${rawTitle.toLowerCase()}`;
      albumTitle = rawTitle;
    } else {
      const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
      const prev = lastLegacyByCat[cat];
      if (prev && ts > 0 && Math.abs(ts - prev.ts) <= 60 * 1000) {
        stackKey = prev.key;
        prev.ts = ts;
      } else {
        autoBatchCounter += 1;
        stackKey = `legacy_${cat}_${autoBatchCounter}_${row.id}`;
        lastLegacyByCat[cat] = { key: stackKey, ts };
      }
    }

    if (!stackMap.has(stackKey)) {
      stackMap.set(stackKey, {
        stackKey,
        id: row.id,
        allIds: [],
        category: cat,
        title: albumTitle || row.alt_text || `${cat.charAt(0).toUpperCase() + cat.slice(1)} Story`,
        alt_text: albumTitle || row.alt_text || '',
        file_path: row.file_path,
        images: [],
        photos: [],
        order_index: row.order_index || 0,
        created_at: row.created_at
      });
    }

    const group = stackMap.get(stackKey);
    group.allIds.push(row.id);
    if (row.file_path) {
      group.images.push(row.file_path);
    }
    group.photos.push({
      id: row.id,
      file_path: row.file_path,
      order_index: row.order_index || 0
    });
    if (!group.alt_text && row.alt_text) {
      group.alt_text = row.alt_text;
      group.title = row.alt_text;
    }
  }

  const stacks = Array.from(stackMap.values()).map((s) => ({
    ...s,
    file_path: s.images[0] || s.file_path,
    id: s.allIds[0] || s.id,
    count: s.images.length
  }));

  stacks.sort((a, b) => {
    const oa = Number(a.order_index) || 0;
    const ob = Number(b.order_index) || 0;
    if (oa !== ob) return oa - ob;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  return stacks;
}

module.exports = { groupPhotosIntoStacks };
