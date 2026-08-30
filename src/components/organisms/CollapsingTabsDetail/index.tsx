import { useCallback, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { MaterialTabBar, Tabs } from 'react-native-collapsible-tab-view';
import type { TabBarProps, TabItemProps } from 'react-native-collapsible-tab-view';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface CollapsingTabDef {
  name: string;
  icon: IconName;
  label: string;
  render: () => ReactNode;
}

export interface CollapsingTabsDetailProps {
  // Card di atas tab bar yang ikut scroll away (collapsing) lalu tab bar menempel di bawah nav bar.
  header?: ReactNode;
  tabs: CollapsingTabDef[];
  initialTabName?: string;
  // Satu elemen RefreshControl dipakai bersama semua tab (library meng-clone-nya per ScrollView).
  refreshControl?: ReactElement;
  onTabChange?: (name: string) => void;
}

interface TabBarLabelProps {
  index: number;
  indexDecimal: SharedValue<number>;
  icon: IconName;
  text: string;
}

// Ikon+label tab yang bereaksi ke posisi swipe (indexDecimal, nilai desimal dari reanimated) —
// ikon biru di-crossfade di atas ikon abu-abu (fill SVG tidak bisa dianimasikan langsung lewat
// style), sementara warna teks snap persis seperti logika bawaan MaterialTabItem si library.
function TabBarLabel(props: TabBarLabelProps) {
  const { index, indexDecimal, icon, text } = props;

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(indexDecimal.value, [index - 1, index, index + 1], [0, 1, 0], Extrapolation.CLAMP),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: Math.abs(index - indexDecimal.value) < 0.5 ? colors.primary : colors.textMuted,
  }));

  return (
    <View style={styles.tabLabelColumn}>
      <View style={styles.tabIconStack}>
        <Icon name={icon} size={16} color={colors.textMuted} />
        <Animated.View style={[StyleSheet.absoluteFill, activeIconStyle]}>
          <Icon name={icon} size={16} color={colors.primary} />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.tabLabelText, labelStyle]} numberOfLines={2}>
        {text}
      </Animated.Text>
    </View>
  );
}

// Diketik `TabItemProps<any>`: generic-nya (`TabItemProps<T>`) menyimpan `label` yang merujuk balik
// ke dirinya sendiri, dan itu bikin TS menolak fungsi bertipe `TabItemProps<string>` dipasang ke
// `Tabs.Tab name="..."` (yang menyempit ke `TabItemProps<"...">`) meski cuma field index/indexDecimal
// yang dipakai di sini — `any` di titik sempit ini aman karena tidak ada field bertipe T yang diakses.
function makeTabLabelRenderer(icon: IconName, text: string) {
  return function renderTabLabel(itemProps: TabItemProps<any>) {
    return <TabBarLabel index={itemProps.index} indexDecimal={itemProps.indexDecimal} icon={icon} text={text} />;
  };
}

// Scaffold tab detail dengan header collapsing — dipakai PersonnelTabs & PersitTabs supaya
// tampilan (header card ikut scroll, tab bar menempel di bawah nav bar) konsisten. Semua prop yang
// masuk ke `Tabs.Container` di-memo-kan supaya re-render dari parent (mis. data async selesai
// dimuat) tidak memicu library mengukur ulang / mereset scroll saat transisi tab.
export default function CollapsingTabsDetail(props: CollapsingTabsDetailProps) {
  const { header, tabs, initialTabName, refreshControl, onTabChange } = props;

  // `Tabs.Container`'s own auto-measurement (when `headerHeight` isn't passed) races with the first
  // paint: the ScrollView's top padding can settle smaller than the header's real height,
  // permanently hiding the top slice of tab content behind the header. Measuring it ourselves via
  // an always-mounted, invisible copy and feeding it back as `headerHeight` sidesteps that race.
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);

  // Signature stabil (nama+ikon+label saja) — renderer label tidak perlu dibuat ulang tiap kali
  // `tabs` diganti identitasnya oleh parent, cuma kalau salah satu ikon/label benar-benar berubah.
  const signature = tabs.map(tab => `${tab.name}:${tab.icon}:${tab.label}`).join('|');
  const labelRenderers = useMemo(
    () => Object.fromEntries(tabs.map(tab => [tab.name, makeTabLabelRenderer(tab.icon, tab.label)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  const handleTabChange = useCallback(
    ({ tabName }: { tabName: string }) => onTabChange?.(tabName),
    [onTabChange],
  );

  const renderHeader = useCallback(() => <>{header}</>, [header]);
  const renderTabBar = useCallback(
    (tabBarProps: TabBarProps<string>) => (
      <MaterialTabBar
        {...tabBarProps}
        style={styles.tabBar}
        indicatorStyle={styles.tabIndicator}
        tabStyle={styles.tabItem}
        activeColor={colors.primary}
        inactiveColor={colors.textMuted}
      />
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <View
        style={styles.headerMeasure}
        pointerEvents="none"
        onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        {header}
      </View>
      {headerHeight === null ? null : (
        <Tabs.Container
          initialTabName={initialTabName}
          headerHeight={headerHeight}
          onTabChange={handleTabChange}
          renderHeader={renderHeader}
          renderTabBar={renderTabBar}>
          {tabs.map(tab => (
            <Tabs.Tab key={tab.name} name={tab.name} label={labelRenderers[tab.name]}>
              <Tabs.ScrollView contentContainerStyle={styles.tabScrollContent} refreshControl={refreshControl}>
                {tab.render()}
              </Tabs.ScrollView>
            </Tabs.Tab>
          ))}
        </Tabs.Container>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerMeasure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIndicator: {
    backgroundColor: colors.primary,
    height: 2,
  },
  tabItem: {
    height: 64,
  },
  tabLabelColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabIconStack: {
    width: 16,
    height: 16,
  },
  tabLabelText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Sengaja TIDAK ada `paddingTop` di sini — `Tabs.ScrollView` menggabungkan `contentContainerStyle`
  // ini dengan style hitungannya sendiri lewat array `[computed, ini]`, jadi `paddingTop` di sini
  // akan MENIMPA `paddingTop` (headerHeight+tabBarHeight) yang justru dipakai buat mendorong konten
  // ke bawah header — akibatnya baris teratas tiap tab ketutupan header. Jarak ke card pertama
  // diatur lewat `marginTop` masing-masing tab body.
  tabScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
});
