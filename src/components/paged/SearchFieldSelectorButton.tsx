import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Cancel01Icon, CheckmarkCircle02Icon, FilterHorizontalIcon, Search01Icon } from 'hugeicons-react-native';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/ui';
import { Text } from '../ui/text';

export interface SearchFieldSelectorOption { key: string; label: string }

interface Props {
  options: readonly SearchFieldSelectorOption[];
  selectedFields: readonly string[];
  onChange: (fields: string[]) => void;
  compact?: boolean;
  embedded?: boolean;
}

export function SearchFieldSelectorButton({ options, selectedFields, onChange, compact = false, embedded = false }: Props): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const dark = themeMode === 'dark';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const colors = { bg: dark ? '#21152c' : '#fff', card: dark ? '#2a1935' : '#f8fafc', border: dark ? '#4a3657' : '#e2e8f0', text: dark ? '#f8fafc' : '#0f172a', muted: dark ? '#a99ab5' : '#64748b', primary: '#db2777' };
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? options.filter((item) => item.label.toLocaleLowerCase().includes(term)) : options;
  }, [options, query]);
  const toggle = (key: string): void => {
    if (selectedFields.includes(key)) {
      if (selectedFields.length > 1) onChange(selectedFields.filter((field) => field !== key));
    } else onChange([...selectedFields, key]);
  };

  return <>
    <TouchableOpacity style={[styles.trigger, compact && styles.triggerCompact, embedded && styles.triggerEmbedded, { borderColor: embedded ? 'transparent' : colors.border, backgroundColor: embedded ? 'transparent' : colors.card }]} onPress={() => setOpen(true)} activeOpacity={0.75} accessibilityLabel={t('common.searchFields', 'Arama alanları')}>
      <FilterHorizontalIcon size={18} color={colors.primary} variant="stroke" />
      {selectedFields.length < options.length ? <View style={styles.badge}><Text style={styles.badgeText}>{selectedFields.length}</Text></View> : null}
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { setOpen(false); setQuery(''); }}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { setOpen(false); setQuery(''); }} />
        <View style={[styles.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}><FilterHorizontalIcon size={20} color={colors.primary} /></View>
            <View style={styles.headerText}><Text style={[styles.title, { color: colors.text }]}>{t('common.searchFields', 'Arama alanları')}</Text><Text style={[styles.help, { color: colors.muted }]}>{t('common.searchFieldsHelp', 'Aramanın uygulanacağı alanları seçin. En az bir alan seçili kalmalıdır.')}</Text></View>
            <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}><Cancel01Icon size={21} color={colors.muted} /></TouchableOpacity>
          </View>
          <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.card }]}><Search01Icon size={17} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder={t('common.searchFieldsFilterPlaceholder', 'Alan ara...')} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text }]} /></View>
          <ScrollView style={styles.list} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
            {visible.map((option) => { const checked = selectedFields.includes(option.key); const locked = checked && selectedFields.length === 1; return <TouchableOpacity key={option.key} disabled={locked} onPress={() => toggle(option.key)} style={[styles.option, checked && { backgroundColor: colors.primary + '16' }, locked && styles.locked]}><View style={[styles.check, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : 'transparent' }]}>{checked ? <CheckmarkCircle02Icon size={14} color="#fff" variant="stroke" /> : null}</View><Text numberOfLines={1} style={[styles.optionText, { color: colors.text }]}>{option.label}</Text></TouchableOpacity>; })}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: colors.border }]}><Text style={[styles.count, { color: colors.muted }]}>{selectedFields.length}/{options.length} {t('common.searchFieldsCount', 'alan seçili')}</Text><View style={styles.footerActions}>{selectedFields.length > 1 ? <TouchableOpacity onPress={() => onChange([options[0].key])}><Text style={[styles.clear, { color: colors.muted }]}>{t('common.searchFieldsClear', 'Temizle')}</Text></TouchableOpacity> : null}{selectedFields.length < options.length ? <TouchableOpacity onPress={() => onChange(options.map((item) => item.key))}><Text style={[styles.all, { color: colors.primary }]}>{t('common.searchFieldsSelectAll', 'Tümünü seç')}</Text></TouchableOpacity> : null}</View></View>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ trigger: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, triggerCompact: { width: 42, height: 42 }, triggerEmbedded: { width: 38, height: 38, borderWidth: 0 }, badge: { position: 'absolute', right: -3, top: -4, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, backgroundColor: '#db2777', alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.58)', alignItems: 'center', justifyContent: 'center', padding: 18 }, panel: { width: '100%', maxWidth: 430, maxHeight: '75%', borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 16 }, headerIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1 }, title: { fontSize: 16, fontWeight: '800' }, help: { marginTop: 3, fontSize: 11, lineHeight: 16 }, search: { marginHorizontal: 14, marginBottom: 8, height: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { flex: 1, fontSize: 13 }, list: { maxHeight: 350 }, grid: { padding: 10, flexDirection: 'row', flexWrap: 'wrap' }, option: { width: '50%', minHeight: 43, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, locked: { opacity: .55 }, check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, optionText: { flex: 1, fontSize: 13, fontWeight: '600' }, footer: { minHeight: 48, borderTopWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, footerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 }, count: { fontSize: 11, fontWeight: '600' }, clear: { fontSize: 12, fontWeight: '700' }, all: { fontSize: 12, fontWeight: '800' } });
