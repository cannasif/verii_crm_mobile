import React, { forwardRef } from "react";
import {
  ProductPicker as SharedProductPicker,
  type ProductPickerProps,
  type ProductPickerRef,
} from "@/components/shared/product-picker/ProductPicker";
import { VoiceSearchButton } from "./VoiceSearchButton";

export type {
  ProductPickerRef,
  RelatedStocksSelectionProps,
} from "@/components/shared/product-picker/ProductPicker";

export const ProductPicker = forwardRef<ProductPickerRef, ProductPickerProps>(
  function DemandProductPicker(props, ref): React.ReactElement {
    return (
      <SharedProductPicker
        {...props}
        ref={ref}
        pricingRuleType="Demand"
        VoiceSearchButtonComponent={VoiceSearchButton}
      />
    );
  }
);
