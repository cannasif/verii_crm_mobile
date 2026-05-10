import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  FlatList,
  ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { UserMultipleIcon, UserIcon, Search01Icon, Tick02Icon } from "hugeicons-react-native";
import type { Salesmen360VisibleUserDto } from "../types";
import { SalesmanPickerVoiceButton } from "./SalesmanPickerVoiceButton";

interface Salesman360SalesmanPickerModalProps {
  visible: boolean;
  onClose: () => void;
  users: Salesmen360VisibleUserDto[];
  selectedUserId: number | undefined;
  onSelectUser: (userId: number) => void;
  colors: ThemeColors;
  isDark: boolean;
  title: string;
  sheetSubtitle: string;
  selfLabel: string;
  searchPlaceholder: string;
  noResultsLabel: string;
}

const ROW_RADIUS = 20;

function accentRingIdle(accent: string): string {
  return accent.length === 7 ? `${accent}5A` : accent;
}

type PickerRowProps = {
  item: Salesmen360VisibleUserDto;
  selectedUserId: number | undefined;
  colors: ThemeColors;
  selfLabel: string;
  onSelect: (userId: number) => void;
  onClose: () => void;
};

function ListSeparator(): React.ReactElement {
  return <View style={styles.rowSeparator} />;
}

const SalesmanPickerListRow = React.memo(function SalesmanPickerListRow({
  item,
  selectedUserId,
  colors,
  selfLabel,
  onSelect,
  onClose,
}: PickerRowProps): React.ReactElement {
  const selected = selectedUserId != null && item.userId === selectedUserId;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        onSelect(item.userId);
        onClose();
      }}
      style={[
        styles.row,
        {
          borderColor: selected ? colors.accent : colors.border,
          borderWidth: selected ? 2 : 1,
          backgroundColor: selected ? colors.activeBackground : colors.card,
        },
      ]}
    >
      <View
        style={[
          styles.rowAvatar,
          {
            borderColor: colors.border,
            backgroundColor: colors.backgroundSecondary,
          },
        ]}
      >
        <UserIcon size={20} color={colors.textMuted} variant="stroke" strokeWidth={2} />
      </View>
      <View style={styles.rowBody}>
        <Text unstyled style={[styles.rowName, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.fullName}
        </Text>
        {item.email ? (
          <Text unstyled style={[styles.rowEmail, { color: colors.textMuted }]} numberOfLines={1}>
            {item.email}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowTrail}>
        {item.isSelf ? (
          <View
            style={[
              styles.selfChip,
              {
                borderColor: colors.border,
                backgroundColor: colors.backgroundSecondary,
              },
            ]}
          >
            <Text unstyled style={[styles.selfChipText, { color: colors.textSecondary }]}>
              {selfLabel}
            </Text>
          </View>
        ) : null}
        {selected ? (
          <Tick02Icon size={17} color={colors.accent} variant="stroke" strokeWidth={2.2} />
        ) : (
          <View style={[styles.radioOuter, { borderColor: colors.border }]} />
        )}
      </View>
    </TouchableOpacity>
  );
});

export function Salesman360SalesmanPickerModal({
  visible,
  onClose,
  users,
  selectedUserId,
  onSelectUser,
  colors,
  isDark,
  title,
  sheetSubtitle,
  selfLabel,
  searchPlaceholder,
  noResultsLabel,
}: Salesman360SalesmanPickerModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 18) + 6;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
      setSearchFocused(false);
    }
  }, [visible]);

  const sheetShadow = useMemo(
    () =>
      Platform.select({
        ios: {
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: -14 },
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowRadius: 28,
        },
        android: {
          elevation: 20,
        },
        default: {},
      }),
    [colors.text, isDark]
  );

  const backdropColor = isDark
    ? colors.background.length === 7
      ? `${colors.background}F0`
      : "rgba(12, 5, 22, 0.94)"
    : colors.text.length === 7
      ? `${colors.text}40`
      : "rgba(17, 24, 39, 0.25)";

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter((u) => {
      const name = u.fullName.toLowerCase();
      const mail = (u.email ?? "").toLowerCase();
      return name.includes(q) || mail.includes(q);
    });
  }, [users, searchQuery]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Salesmen360VisibleUserDto>) => (
      <SalesmanPickerListRow
        item={item}
        selectedUserId={selectedUserId}
        colors={colors}
        selfLabel={selfLabel}
        onSelect={onSelectUser}
        onClose={onClose}
      />
    ),
    [colors, onClose, onSelectUser, selectedUserId, selfLabel]
  );

  const keyExtractor = useCallback((item: Salesmen360VisibleUserDto) => String(item.userId), []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={[styles.backdrop, { backgroundColor: backdropColor }]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            sheetShadow,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: bottomPad,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <UserMultipleIcon size={19} color={colors.textMuted} variant="stroke" strokeWidth={1.85} />
            </View>
            <View style={styles.headerText}>
              <Text unstyled style={[styles.sheetTitle, { color: colors.textSecondary }]}>
                {title}
              </Text>
              <Text unstyled style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                {sheetSubtitle}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.searchField,
              {
                backgroundColor: "transparent",
                borderColor: searchFocused ? colors.accent : accentRingIdle(colors.accent),
                borderWidth: searchFocused ? 2 : 1,
              },
            ]}
          >
            <Search01Icon size={18} color={colors.textMuted} variant="stroke" strokeWidth={1.85} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textSecondary }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              underlineColorAndroid="transparent"
              selectionColor={colors.accent}
            />
            <SalesmanPickerVoiceButton
              onResult={setSearchQuery}
              containerStyle={{ backgroundColor: "transparent", borderWidth: 0 }}
            />
          </View>

          {filteredUsers.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text unstyled style={[styles.emptyText, { color: colors.textMuted }]}>
                {noResultsLabel}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={ListSeparator}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              windowSize={8}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 8,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 3,
    borderRadius: 2,
    marginBottom: 14,
    opacity: 0.75,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  sheetSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
    lineHeight: 15,
    opacity: 0.92,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 0,
    letterSpacing: -0.1,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: 10,
  },
  rowSeparator: {
    height: 8,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: ROW_RADIUS,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  rowEmail: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
    opacity: 0.9,
  },
  rowTrail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  selfChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  selfChipText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
});
