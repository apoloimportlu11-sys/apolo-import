"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductDetailBody } from "@/components/catalog/product-detail-body";
import { setLenisLocked } from "@/lib/lenis-lock";
import type { Product } from "@/lib/products-data";

type ProductQuickViewProps = {
  product: Product | null;
  catalog: Product[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
};

export function ProductQuickView({
  product,
  catalog,
  onClose,
  onSelectProduct,
}: ProductQuickViewProps) {
  const open = Boolean(product);

  useEffect(() => {
    setLenisLocked(open);
    return () => setLenisLocked(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        data-lenis-prevent
        className="flex max-h-[min(82vh,560px)] w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden overscroll-contain rounded-2xl p-0 sm:max-w-[44rem] [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-background/90 [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:shadow-sm [&_[data-slot=dialog-close]]:opacity-100"
      >
        {product ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>
                Detalle de {product.name} de {product.brand}
              </DialogDescription>
            </DialogHeader>
            <ProductDetailBody
              key={product.id}
              product={product}
              catalog={catalog}
              onSelectProduct={onSelectProduct}
              onQuoted={onClose}
              compact
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
