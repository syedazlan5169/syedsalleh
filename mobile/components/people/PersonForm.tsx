import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
        label="Name"
        value={values.name}
        onChangeText={(text) => handleChange('name', text)}
        placeholder="Full name"
      />
      <FormField
        label="NRIC"
        value={values.nric}
        onChangeText={(text) => handleChange('nric', text)}
        placeholder="NRIC"
      />
      <FormField
        label="Date of Birth"
        value={values.date_of_birth}
        onChangeText={(text) => handleChange('date_of_birth', text)}
        placeholder="YYYY-MM-DD"
      />
      <FormField
        label="Gender"
        value={values.gender}
        onChangeText={(text) => handleChange('gender', text)}
        placeholder="Gender"
      />
      <FormField
        label="Blood Type"
        value={values.blood_type}
        onChangeText={(text) => handleChange('blood_type', text)}
        placeholder="Blood type"
      />
      <FormField
        label="Occupation"
        value={values.occupation}
        onChangeText={(text) => handleChange('occupation', text)}
        placeholder="Occupation"
      />
      <FormField
        label="Phone"
        value={values.phone}
        onChangeText={(text) => handleChange('phone', text)}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />
      <FormField
        label="Email"
        value={values.email}
        onChangeText={(text) => handleChange('email', text)}
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormField
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
};

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}: FormFieldProps) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
    />
  </View>
);

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 999,
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

