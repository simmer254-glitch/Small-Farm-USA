import { useState } from 'react';
import { Text, TextInput, View, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { localDateString } from '@/domain/dates';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  style?: object;
};

function FieldShell({
  label,
  error,
  children,
  style,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  keyboardType,
  style,
}: BaseProps<T> & { keyboardType?: 'default' | 'numeric' }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <FieldShell label={label} error={error?.message} style={style}>
          <TextInput
            value={value == null ? '' : String(value)}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.faint}
            keyboardType={keyboardType}
            style={[styles.input, error && styles.inputError]}
          />
        </FieldShell>
      )}
    />
  );
}

export function DateField<T extends FieldValues>({ control, name, label, style }: BaseProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const dateVal = value ? new Date(value as string) : new Date();
        return (
          <FieldShell label={label} error={error?.message} style={style}>
            {Platform.OS === 'web' ? (
              <TextInput
                value={value == null ? '' : String(value)}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.faint}
                style={[styles.input, error && styles.inputError]}
              />
            ) : (
              <>
                <Pressable onPress={() => setOpen(true)} style={[styles.input, error && styles.inputError]}>
                  <Text style={styles.inputText}>{(value as string) || 'Select date'}</Text>
                </Pressable>
                {open && (
                  <DateTimePicker
                    value={dateVal}
                    mode="date"
                    display="default"
                    onChange={(_, d) => {
                      setOpen(false);
                      if (d) {
                        onChange(localDateString(d));
                      }
                    }}
                  />
                )}
              </>
            )}
          </FieldShell>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    padding: 13,
    fontSize: 15,
    fontFamily: fonts.bodyRegular,
    backgroundColor: colors.inputBgAlt,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.danger,
    marginTop: 4,
  },
});
