import { create } from "zustand";

export const useRouletteStore = create((set, get) => ({
  items: [], // { id, label, count, voters }
  votedUserIds: new Set(),
  isCollecting: true,
  isSpinning: false,
  winner: null,
  settings: {
    commandPrefix: "!투표",
    allowDuplicateUser: false,
    maxLabelLength: 16,
  },

  setSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  toggleCollecting: (active) =>
    set((state) => ({
      isCollecting: typeof active === "boolean" ? active : !state.isCollecting,
    })),

  processChatMessage: (uid, _nickname, message) => {
    const { isCollecting, isSpinning, settings, votedUserIds, items } = get();
    if (!isCollecting || isSpinning || !message) return;

    const trimmed = message.trim();
    const prefix = settings.commandPrefix.trim();
    if (!prefix || !trimmed.startsWith(`${prefix} `)) return;

    const rawLabel = trimmed.slice(prefix.length).trim().replace(/\s+/g, " ");
    if (!rawLabel || rawLabel.length > settings.maxLabelLength) return;

    if (!settings.allowDuplicateUser && uid && votedUserIds.has(uid)) {
      return;
    }

    const normalizedId = rawLabel.toLowerCase();
    const nextVoted = new Set(votedUserIds);
    if (uid) nextVoted.add(uid);

    const idx = items.findIndex((item) => item.id === normalizedId);
    const nextItems =
      idx > -1
        ? items.map((item, i) =>
            i === idx
              ? {
                  ...item,
                  count: item.count + 1,
                  voters: uid ? [...item.voters, uid] : item.voters,
                }
              : item,
          )
        : [
            ...items,
            {
              id: normalizedId,
              label: rawLabel,
              count: 1,
              voters: uid ? [uid] : [],
            },
          ];

    set({ items: nextItems, votedUserIds: nextVoted });
  },

  addManualItem: (label, count = 1) => {
    const clean = (label || "").trim().replace(/\s+/g, " ");
    const safeCount = Math.max(1, Number(count) || 1);
    if (!clean) return;

    const normalizedId = clean.toLowerCase();
    set((state) => {
      const exists = state.items.some((i) => i.id === normalizedId);
      return {
        items: exists
          ? state.items.map((i) =>
              i.id === normalizedId ? { ...i, count: i.count + safeCount } : i,
            )
          : [
              ...state.items,
              { id: normalizedId, label: clean, count: safeCount, voters: [] },
            ],
      };
    });
  },

  adjustItemCount: (id, delta) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.id === id
            ? { ...item, count: Math.max(0, item.count + delta) }
            : item,
        )
        .filter((item) => item.count > 0),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  startSpin: () => {
    const { items, isSpinning } = get();
    if (isSpinning || items.length === 0) return null;

    const total = items.reduce((acc, cur) => acc + cur.count, 0);
    if (total <= 0) return null;

    let r = Math.random() * total;
    let selected = items[0];

    for (const item of items) {
      if (r < item.count) {
        selected = item;
        break;
      }
      r -= item.count;
    }

    set({ isSpinning: true, winner: selected });
    return selected;
  },

  finishSpin: () => set({ isSpinning: false }),

  clearWinner: () => set({ winner: null }),

  resetVotes: () =>
    set({
      items: [],
      votedUserIds: new Set(),
      winner: null,
      isSpinning: false,
    }),
}));
