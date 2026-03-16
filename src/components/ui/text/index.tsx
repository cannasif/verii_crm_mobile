import React from 'react';
import { Text as RNText } from 'react-native';
import { textStyle } from './styles';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { useUIStore } from '../../../store/ui';

type ITextProps = React.ComponentProps<typeof RNText> &
  VariantProps<typeof textStyle> & {
    unstyled?: boolean;
    disableThemeColor?: boolean;
    color?: string;
  };

const Text = React.forwardRef<React.ComponentRef<typeof RNText>, ITextProps>(
  function Text(
    {
      className,
      isTruncated,
      bold,
      underline,
      strikeThrough,
      size = 'md',
      sub,
      italic,
      highlight,
      style,
      unstyled = false,
      disableThemeColor = false,
      color,
      ...props
    },
    ref
  ) {
    const { themeMode } = useUIStore();

    const activeColor = color ?? (themeMode === 'dark' ? '#FFFFFF' : '#111827');

    return (
      <RNText
        className={
          unstyled
            ? className
            : textStyle({
                isTruncated: isTruncated as boolean,
                bold: bold as boolean,
                underline: underline as boolean,
                strikeThrough: strikeThrough as boolean,
                size,
                sub: sub as boolean,
                italic: italic as boolean,
                highlight: highlight as boolean,
                class: className,
              })
        }
        style={disableThemeColor ? style : [style, { color: activeColor }]}
        {...props}
        ref={ref}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text };