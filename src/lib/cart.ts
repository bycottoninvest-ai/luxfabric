"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string;
  color: string;
  colorHex: string;
  size: string;
  price: number;
  quantity: number;
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  setQty: (variantId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find((i) => i.variantId === item.variantId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: Math.min(i.maxStock, i.quantity + item.quantity) }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (variantId) => set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      setQty: (variantId, quantity) =>
        set({
          items: get().items
            .map((i) =>
              i.variantId === variantId
                ? { ...i, quantity: Math.max(1, Math.min(i.maxStock, quantity)) }
                : i
            )
            .filter((i) => i.quantity > 0),
        }),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: "luxfabric-cart" }
  )
);
