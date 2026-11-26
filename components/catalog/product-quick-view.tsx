"use client";

import { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductDetailBody } from "@/components/catalog/product-detail-body";
import { ProductUnavailablePanel } from "@/components/catalog/product-unavailable-panel";
import { presentationsOfProduct } from "@/lib/catalog/presentations";
import { stockLevel } from "@/lib/catalog/stock-status";
import { setLenisLocked } from "@/lib/lenis-lock";
import type { Product } from "@/lib/products-data";

type ProductQuickViewProps = {
  product: Product | null;
  catalog: Product[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
};

function isProductFullyOut(product: Product) {
  const options = presentationsOfProduct(product);
  if (options.length === 0) {
    return stockLevel({ stock: product.stock, stockMin: product.stockMin }) === "out";
  }
  return options.every(
    (item) => stockLevel({ stock: item.stock, stockMin: item.stockMin }) === "out"
  );
}

export function ProductQuickView({
  product,
  catalog,
  onClose,
  onSelectProduct,
}: ProductQuickViewProps) {
  const open = Boolean(product);
  const fullyOut = useMemo(
    () => (product ? isProductFullyOut(product) : false),
    [product]
  );

  useEffect(() => {
    setLenisLocked(open);
    return () => setLenisLocked(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        data-lenis-prevent
        className={
          fullyOut
            ? "overflow-hidden border border-white/10 bg-[#0c0d12] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:max-w-md [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-white/10 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:opacity-100 hover:[&_[data-slot=dialog-close]]:bg-white/20"
            : "flex max-h-[min(94dvh,820px)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden overscroll-contain rounded-2xl border border-border bg-card p-0 sm:max-w-[54rem] [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-background/95 [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:shadow-sm [&_[data-slot=dialog-close]]:opacity-100"
        }
        style={fullyOut ? { backgroundColor: "#0c0d12" } : undefined}
      >
        {product && fullyOut ? (
          <ProductUnavailablePanel
            product={product}
            catalog={catalog}
            onSelectAlternative={onSelectProduct}
            onDismiss={onClose}
          />
        ) : product ? (
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
