import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Card from '@/components/molecules/Card';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface SectionCardProps {
  icon: IconName;
  title: string;
  children: ReactNode;
}

export default function SectionCard(props: SectionCardProps) {
  const { icon, title, children } = props;
  const rows = Children.toArray(children);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Icon name={icon} size={18} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {rows.map((row, index) => {
        if (!isValidElement(row)) return row;
        const isLast = index === rows.length - 1;
        const element = row as ReactElement<{ style?: StyleProp<ViewStyle> }>;
        return cloneElement(element, {
          key: index,
          style: isLast ? [element.props.style, styles.lastRow] : element.props.style,
        });
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
});
