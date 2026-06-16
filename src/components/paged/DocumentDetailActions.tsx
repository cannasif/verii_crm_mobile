import React, { memo } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Cancel01Icon,
  FloppyDiskIcon,
  SentIcon,
  Tick02Icon,
  FileEditIcon,
} from "hugeicons-react-native";
import { Text } from "../ui/text";

export interface DocumentDetailActionsProps {
  visible: boolean;
  accent: string;
  accentSecondary: string;
  errorColor: string;
  showApproveReject: boolean;
  canApproveReject: boolean;
  rejectPending: boolean;
  approvePending: boolean;
  onReject: () => void;
  onApprove: () => void;
  rejectLabel: string;
  approveLabel: string;
  showSaveUpdate: boolean;
  hasUnsavedChanges: boolean;
  isSavingUpdate: boolean;
  onSaveUpdate: () => void;
  saveLabel: string;
  showOnayaGonder: boolean;
  startApprovalPending: boolean;
  onStartApproval: () => void;
  sendForApprovalLabel: string;
  showCustomerCancel: boolean;
  cancelByCustomerPending: boolean;
  onCustomerCancel: () => void;
  customerCancelLabel: string;
  showRevise?: boolean;
  revisePending?: boolean;
  onRevise?: () => void;
  reviseLabel?: string;
}

function ActionButtonContent({
  icon,
  label,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
}): React.ReactElement {
  return (
    <View style={styles.buttonContent}>
      {icon}
      <Text
        style={[styles.buttonText, compact && styles.buttonTextCompact]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

function DocumentDetailActionsComponent({
  visible,
  accent,
  accentSecondary,
  errorColor,
  showApproveReject,
  canApproveReject,
  rejectPending,
  approvePending,
  onReject,
  onApprove,
  rejectLabel,
  approveLabel,
  showSaveUpdate,
  hasUnsavedChanges,
  isSavingUpdate,
  onSaveUpdate,
  saveLabel,
  showOnayaGonder,
  startApprovalPending,
  onStartApproval,
  sendForApprovalLabel,
  showCustomerCancel,
  cancelByCustomerPending,
  onCustomerCancel,
  customerCancelLabel,
  showRevise = false,
  revisePending = false,
  onRevise,
  reviseLabel = "",
}: DocumentDetailActionsProps): React.ReactElement | null {
  if (!visible && !showRevise) return null;

  const saveActionsDisabled = isSavingUpdate;
  const compactLabels = showOnayaGonder && showCustomerCancel;

  return (
    <View style={styles.actionBar}>
      {showApproveReject ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: errorColor }]}
            onPress={onReject}
            disabled={!canApproveReject || rejectPending}
            activeOpacity={0.9}
          >
            {rejectPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ActionButtonContent
                icon={<Cancel01Icon size={16} color="#FFFFFF" variant="stroke" strokeWidth={2} />}
                label={rejectLabel}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonFlex}
            onPress={onApprove}
            disabled={!canApproveReject || approvePending}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              {approvePending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ActionButtonContent
                  icon={<Tick02Icon size={16} color="#FFFFFF" variant="stroke" strokeWidth={2} />}
                  label={approveLabel}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}

      {showSaveUpdate ? (
        <>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButtonFlex,
                !hasUnsavedChanges && styles.buttonDisabled,
              ]}
              onPress={onSaveUpdate}
              disabled={!hasUnsavedChanges || saveActionsDisabled}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[accentSecondary, accent]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradientButton}
              >
                {isSavingUpdate ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ActionButtonContent
                    icon={<FloppyDiskIcon size={16} color="#FFFFFF" variant="stroke" strokeWidth={2} />}
                    label={saveLabel}
                    compact={compactLabels}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {showOnayaGonder ? (
              <TouchableOpacity
                style={styles.actionButtonFlex}
                onPress={onStartApproval}
                disabled={startApprovalPending || saveActionsDisabled}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[accent, accentSecondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  {startApprovalPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ActionButtonContent
                      icon={<SentIcon size={16} color="#FFFFFF" variant="stroke" strokeWidth={2} />}
                      label={sendForApprovalLabel}
                      compact={compactLabels}
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>

          {showCustomerCancel ? (
            <TouchableOpacity
              style={styles.actionButtonFull}
              onPress={onCustomerCancel}
              disabled={cancelByCustomerPending || saveActionsDisabled}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#be123c", "#e11d48"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                {cancelByCustomerPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ActionButtonContent
                    icon={<Cancel01Icon size={16} color="#FFFFFF" variant="stroke" strokeWidth={2} />}
                    label={customerCancelLabel}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}

      {showRevise ? (
        <TouchableOpacity
          style={styles.actionButtonFull}
          onPress={onRevise}
          disabled={revisePending}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[accentSecondary, accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            {revisePending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ActionButtonContent
                icon={<FileEditIcon size={16} color="#FFFFFF" variant="stroke" strokeWidth={2} />}
                label={reviseLabel}
              />
            )}
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const DocumentDetailActions = memo(DocumentDetailActionsComponent);

const styles = StyleSheet.create({
  actionBar: {
    gap: 8,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  actionButtonFlex: {
    flex: 1,
    minWidth: 0,
  },
  actionButtonFull: {
    width: "100%",
  },
  gradientButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  buttonTextCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
