import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

// Parse NRIC to extract date of birth and gender
const parseNRIC = (nric: string): { dateOfBirth: string; gender: string } | null => {
  if (!nric) return null;

  // Remove hyphens and spaces from NRIC
  const cleaned = nric.replace(/[-\s]/g, '');

  // Malaysian NRIC format: YYMMDD-PB-G### (12 digits)
  // First 6 digits: YYMMDD, last digit: gender indicator
  if (cleaned.length >= 6 && /^\d+$/.test(cleaned)) {
    // Extract date of birth (first 6 digits: YYMMDD)
    const yy = parseInt(cleaned.substring(0, 2), 10);
    const mm = cleaned.substring(2, 4);
    const dd = cleaned.substring(4, 6);

    // Determine century: 00-30 likely 2000-2030, 31-99 likely 1931-1999
    const year = yy <= 30 ? 2000 + yy : 1900 + yy;

    // Validate date components
    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      // Check if date is valid
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        const dateOfBirth = `${year}-${mm}-${dd}`;

        // Extract gender from last digit: even = Female, odd = Male
        const lastDigit = parseInt(cleaned[cleaned.length - 1], 10);
        const gender = lastDigit % 2 === 0 ? 'Female' : 'Male';

        return { dateOfBirth, gender };
      }
    }
  }

  return null;
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
  const [pickerVisible, setPickerVisible] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (field: keyof PersonFormValues, text: string) => {
    setValues((prev) => {
      const newValues = { ...prev, [field]: text };
      
      // Auto-fill DOB and gender when NRIC is entered
      if (field === 'nric' && text) {
        const parsed = parseNRIC(text);
        if (parsed) {
          newValues.date_of_birth = parsed.dateOfBirth;
          newValues.gender = parsed.gender;
        }
      }
      
      return newValues;
    });
  };

  const handleSelect = (field: keyof PersonFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setPickerVisible(null);
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
      <SelectField
        palette={palette}
        label="Gender"
        value={values.gender}
        options={['Male', 'Female']}
        placeholder="Select gender"
        onSelect={(value) => handleSelect('gender', value)}
        onPress={() => setPickerVisible('gender')}
      />
      <SelectField
        palette={palette}
        label="Blood Type"
        value={values.blood_type}
        options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
        placeholder="Select blood type"
        onSelect={(value) => handleSelect('blood_type', value)}
        onPress={() => setPickerVisible('blood_type')}
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

      {/* Picker Modal */}
      {pickerVisible && (
        <PickerModal
          palette={palette}
          visible={pickerVisible !== null}
          options={
            pickerVisible === 'gender'
              ? ['Male', 'Female']
              : ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
          }
          selectedValue={
            pickerVisible === 'gender' ? values.gender : values.blood_type
          }
          onSelect={(value) => {
            if (pickerVisible === 'gender') {
              handleSelect('gender', value);
            } else {
              handleSelect('blood_type', value);
            }
          }}
          onClose={() => setPickerVisible(null)}
        />
      )}
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

type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onSelect: (value: string) => void;
  onPress: () => void;
  palette: Palette;
};

const SelectField = ({
  label,
  value,
  options,
  placeholder,
  onSelect,
  onPress,
  palette,
}: SelectFieldProps) => (
  <View style={fieldStyles.field}>
    <Text style={[fieldStyles.label, { color: palette.textMuted }]}>{label}</Text>
    <TouchableOpacity
      style={[
        fieldStyles.input,
        {
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          fieldStyles.selectText,
          {
            color: value ? palette.text : palette.textMuted,
          },
        ]}
      >
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  </View>
);

type PickerModalProps = {
  visible: boolean;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  palette: Palette;
};

const PickerModal = ({
  visible,
  options,
  selectedValue,
  onSelect,
  onClose,
  palette,
}: PickerModalProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={pickerStyles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View
        style={[
          pickerStyles.modalContent,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
        onStartShouldSetResponder={() => true}
      >
        <View style={pickerStyles.modalHeader}>
          <Text style={[pickerStyles.modalTitle, { color: palette.text }]}>
            Select Option
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[pickerStyles.modalClose, { color: palette.tint }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              pickerStyles.option,
              selectedValue === option && {
                backgroundColor: palette.tint + '20',
              },
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                pickerStyles.optionText,
                {
                  color: palette.text,
                  fontWeight: selectedValue === option ? '600' : '400',
                },
              ]}
            >
              {option}
            </Text>
            {selectedValue === option && (
              <Text style={[pickerStyles.checkmark, { color: palette.tint }]}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

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
  selectText: {
    fontSize: 16,
  },
});

const pickerStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

