import React from "react";
import {
  SalesDocumentLineForm,
  type SalesDocumentLineFormProps,
} from "@/components/shared/sales-document-line/SalesDocumentLineForm";
import type { OrderLineFormState } from "../types/order-types";
import { PickerModal } from "./PickerModal";
import { ProductPicker } from "./ProductPicker";

type OrderLineFormProps = Omit<
  SalesDocumentLineFormProps<OrderLineFormState>,
  "imageUploadScope"
> & {
  imageUploadScope?: "order-line";
};

export function OrderLineForm(props: OrderLineFormProps): React.ReactElement {
  return (
    <SalesDocumentLineForm<OrderLineFormState>
      {...props}
      documentType="order"
      ProductPickerComponent={ProductPicker}
      PickerModalComponent={PickerModal}
    />
  );
}
