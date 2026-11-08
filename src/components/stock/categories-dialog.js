"use client";
import { useEffect, useRef } from "react";
import { CategoryManager } from "@/components/stock/category-manager";
import { Icon } from "@/components/ui/icon";
export function CategoriesDialog({ categories, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const anterior = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); anterior?.focus?.(); };
  }, []);
  return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="categories-title" className="app-modal-panel app-modal-native animate-modal-in fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-[#ebe8e5] bg-white p-6 shadow-2xl backdrop:bg-[#292524]/45 backdrop:backdrop-blur-sm">
    <div className="app-modal-heading mb-5 flex items-center justify-between gap-4"><h2 id="categories-title" className="text-xl font-semibold text-[#292524]">Categorias</h2><button type="button" aria-label="Fechar categorias" onClick={onClose} className="rounded-lg p-2 text-[#918b87]"><Icon name="close" size={20} /></button></div>
    <CategoryManager categories={categories} embedded />
  </dialog>;
}
