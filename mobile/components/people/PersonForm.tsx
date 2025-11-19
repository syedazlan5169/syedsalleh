import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';

export type PersonFormValues = {
  name: string;
  nric: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  occupation: string;
  address: string;
  phone: string;
  email: string;
};

type Props = {
  initialValues?: PersonFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: PersonFormValues) => Promise<void> | void;
};

export const defaultPersonFormValues: PersonFormValues = {
  name: '',
  nric: '',
  date_of_birth: '',
  gender: '',
  blood_type: '',
  occupation: '',
  address: '',
  phone: '',
  email: '',
};

export function PersonForm({
  initialValues = defaultPersonFormValues,
  submitting = false,
  submitLabel = 'Save',
  onSubmit,
}: Props) {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [values, setValues] = useState<PersonFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (field: keyof PersonFormValues, text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
  };

  const handleSubmit = () => {
    onSubmit(values);
  };

  return (
    <View style={styles.form}>
      <FormField
        palette={palette}
        label="Name"
        value={values.name}
        onChangeText={(text) => handleChange('name', text)}
        placeholder="Full name"
      />
      <FormField
        palette={palette}
        label="NRIC"
        value={values.nric}
        onChangeText={(text) => handleChange('nric', text)}
        placeholder="NRIC"
      />
      <FormField
        palette={palette}
        label="Date of Birth"
        value={values.date_of_birth}
        onChangeText={(text) => handleChange('date_of_birth', text)}
        placeholder="YYYY-MM-DD"
      />
      <FormField
        palette={palette}
        label="Gender"
        value={values.gender}
        onChangeText={(text) => handleChange('gender', text)}
        placeholder="Gender"
      />
      <FormField
        palette={palette}
        label="Blood Type"
        value={values.blood_type}
        onChangeText={(text) => handleChange('blood_type', text)}
        placeholder="Blood type"
      />
      <FormField
        palette={palette}
        label="Occupation"
        value={values.occupation}
        onChangeText={(text) => handleChange('occupation', text)}
        placeholder="Occupation"
      />
      <FormField
        palette={palette}
        label="Phone"
        value={values.phone}
        onChangeText={(text) => handleChange('phone', text)}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />
      <FormField
        palette={palette}
        label="Email"
        value={values.email}
        onChangeText={(text) => handleChange('email', text)}
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormField
        palette={palette}
        label="Address"
        value={values.address}
        onChangeText={(text) => handleChange('address', text)}
        placeholder="Address"
        multiline
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  palette: Palette;
};

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  palette,
}: FormFieldProps) => (
  <View style={fieldStyles.field}>
    <Text style={[fieldStyles.label, { color: palette.textMuted }]}>{label}</Text>
    <TextInput
      style={[
        fieldStyles.input,
        multiline && fieldStyles.inputMultiline,
        {
          borderColor: palette.border,
          backgroundColor: palette.surface,
          color: palette.text,
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor={palette.textMuted}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
    />
  </View>
);

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    form: {
      gap: 18,
    },
    submitButton: {
      marginTop: 12,
      backgroundColor: palette.tint,
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
  });

const fieldStyles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

