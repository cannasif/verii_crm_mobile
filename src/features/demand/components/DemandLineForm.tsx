import React from "react";
import {
  SalesDocumentLineForm,
  type SalesDocumentLineFormProps,
} from "@/components/shared/sales-document-line/SalesDocumentLineForm";
import type { DemandLineFormState } from "../types/demand-types";
import { PickerModal } from "./PickerModal";
import { ProductPicker } from "./ProductPicker";

type DemandLineFormProps = Omit<
  SalesDocumentLineFormProps<DemandLineFormState>,
  "imageUploadScope"
> & {
  imageUploadScope?: "demand-line";
};

export function DemandLineForm(props: DemandLineFormProps): React.ReactElement {
  return (
    <SalesDocumentLineForm<DemandLineFormState>
      {...props}
      documentType="demand"
      ProductPickerComponent={ProductPicker}
      PickerModalComponent={PickerModal}
    />
  );
}
