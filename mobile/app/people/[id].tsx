import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { getAvatarColors } from '@/utils/avatar';
import { formatPersonName, getNameInitial } from '@/utils/text';

import { apiDelete, apiGet, apiPatch, apiPost } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { PersonDetail, PersonDocument } from '../../types/api';

type PersonResponse = {
  person: PersonDetail;
};

type DocumentResponse = {
  document: PersonDocument;
};

type PickedDocument = {
  uri: string;
  mimeType?: string | null;
  name?: string | null;
  size?: number | null;
  file?: any;
};

export default function PersonDetailScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentIsPublic, setDocumentIsPublic] = useState(false);
  const [pickedDocument, setPickedDocument] = useState<PickedDocument | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<number | null>(null);
  const [deletingPerson, setDeletingPerson] = useState(false);

  const personId = Array.isArray(id) ? id[0] : id;

  const loadPerson = useCallback(async () => {
    if (!token || !personId) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet(`/api/people/${personId}`, token)) as PersonResponse;
      setPerson(json.person);
    } catch (err: any) {
      console.log('Person detail error:', err);
      setError(err?.message ?? 'Unable to load person details');
    } finally {
      setLoading(false);
    }
  }, [personId, token]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    } else if (!personId) {
      setError('Missing person id');
    }
  }, [token, personId, router]);

  useFocusEffect(
    useCallback(() => {
      if (!token || !personId) return;
      loadPerson();
    }, [token, personId, loadPerson]),
  );

  useEffect(() => {
    setDocumentName('');
    setDocumentIsPublic(false);
    setPickedDocument(null);
    setDocumentError(null);
  }, [personId]);

  const formattedPersonName = formatPersonName(person?.name);
  const title = formattedPersonName || 'Person Detail';

  const renderAvatar = (detail: PersonDetail) => {
    const avatarColors = getAvatarColors(detail.gender, palette);
    const initial = getNameInitial(detail.name);
    return (
      <View style={[styles.avatar, { backgroundColor: avatarColors.background }]}>
        <Text style={[styles.avatarText, { color: avatarColors.text }]}>
          {initial}
        </Text>
      </View>
    );
  };

  const documents = person?.documents ?? [];
  const canManageDocuments = Boolean(person?.can_manage_documents);
  const canDeletePerson = Boolean(person && user && person.owner_id === user.id);

  const formatFileSize = (size?: number | null) => {
    if (!size || Number.isNaN(size)) return 'Unknown size';
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${size} B`;
  };

  const isPdfDocument = (document: PersonDocument) => {
    const mime = document.mime_type?.toLowerCase() ?? '';
    const url = document.file_url?.toLowerCase() ?? '';
    return mime.includes('pdf') || url.endsWith('.pdf');
  };

  const isImageDocument = (document: PersonDocument) => {
    const mime = document.mime_type?.toLowerCase() ?? '';
    if (mime.startsWith('image/')) return true;
    const url = document.file_url?.toLowerCase() ?? '';
    return /\.(jpg|jpeg|png)$/.test(url);
  };

  const getDocumentActionLabel = (document: PersonDocument) => {
    if (isPdfDocument(document)) return 'Download';
    if (isImageDocument(document)) return 'View';
    return 'Open';
  };

  const handleOpenDocument = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unable to open document', 'This link is not supported on your device.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.log('Open document error:', err);
      Alert.alert('Unable to open document', 'Please try again later.');
    }
  };

  const handlePickDocument = async () => {
    setDocumentError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: Platform.OS !== 'web',
        type: ['application/pdf', 'image/jpeg', 'image/png'],
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];

      if (asset) {
        setPickedDocument({
          uri: asset.uri,
          mimeType: asset.mimeType ?? null,
          name: asset.name ?? asset.uri.split('/').pop() ?? 'Document',
          size: asset.size ?? null,
          file: (asset as any).file ?? null,
        });

        if (!documentName.trim() && asset.name) {
          const baseName = asset.name.replace(/\.[^/.]+$/, '');
          setDocumentName(baseName);
        }
      }
    } catch (err) {
      console.log('Document picker error:', err);
      setDocumentError('Unable to open the document picker.');
    }
  };

  const handleUploadDocument = async () => {
    if (!token || !personId) return;

    if (!pickedDocument) {
      setDocumentError('Please choose a file to upload.');
      return;
    }

    const trimmedName = documentName.trim();

    if (!trimmedName) {
      setDocumentError('Please enter a document name.');
      return;
    }

    setUploadingDocument(true);
    setDocumentError(null);

    try {
      const formData = new FormData();
      formData.append('name', trimmedName);
      formData.append('is_public', documentIsPublic ? '1' : '0');
      if (pickedDocument.file) {
        // Web builds provide a real File blob
        formData.append('file', pickedDocument.file);
      } else {
        formData.append('file', {
          uri: pickedDocument.uri,
          name: pickedDocument.name ?? `${trimmedName}.dat`,
          type: pickedDocument.mimeType ?? 'application/octet-stream',
        } as any);
      }

      const json = (await apiPost(
        `/api/people/${personId}/documents`,
        token,
        formData,
      )) as DocumentResponse;

      setPerson((prev) =>
        prev
          ? {
              ...prev,
              documents: [json.document, ...(prev.documents ?? [])],
            }
          : prev,
      );
      setDocumentName('');
      setDocumentIsPublic(false);
      setPickedDocument(null);
    } catch (err: any) {
      console.log('Upload document error:', err);
      setDocumentError(err?.message ?? 'Unable to upload document.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const deleteDocument = async (documentId: number) => {
    if (!token) return;
    setDeletingDocumentId(documentId);
    setDocumentError(null);

    try {
      await apiDelete(`/api/documents/${documentId}`, token);
      setPerson((prev) =>
        prev
          ? {
              ...prev,
              documents: (prev.documents ?? []).filter((doc) => doc.id !== documentId),
            }
          : prev,
      );
    } catch (err: any) {
      console.log('Delete document error:', err);
      setDocumentError(err?.message ?? 'Unable to delete document.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const confirmDeleteDocument = (documentId: number) => {
    Alert.alert('Delete document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteDocument(documentId),
      },
    ]);
  };

  const handleToggleDocumentVisibility = async (documentId: number, nextValue: boolean) => {
    if (!token) return;
    setUpdatingVisibilityId(documentId);
    setDocumentError(null);
    try {
      const json = (await apiPatch(`/api/documents/${documentId}`, token, {
        is_public: nextValue,
      })) as DocumentResponse;
      setPerson((prev) =>
        prev
          ? {
              ...prev,
              documents: (prev.documents ?? []).map((doc) =>
                doc.id === documentId ? json.document : doc,
              ),
            }
          : prev,
      );
    } catch (err: any) {
      console.log('Update document visibility error:', err);
      setDocumentError(err?.message ?? 'Unable to update document visibility.');
    } finally {
      setUpdatingVisibilityId(null);
    }
  };

  const handleDeletePerson = async () => {
    if (!token || !personId) return;
    setDeletingPerson(true);
    try {
      await apiDelete(`/api/people/${personId}`, token);
      router.replace('/people/my');
    } catch (err: any) {
      console.log('Delete person error:', err);
      Alert.alert('Unable to delete person', err?.message ?? 'Please try again later.');
    } finally {
      setDeletingPerson(false);
    }
  };

  const confirmDeletePerson = () => {
    if (!canDeletePerson) return;
    Alert.alert(
      'Delete person',
      'This will permanently remove this person and all of their documents. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeletePerson },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.text },
          headerShadowVisible: false,
          headerRight:
            person && user && person.owner_id === user.id && personId
              ? () => (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/people/[id]/edit',
                        params: { id: String(personId) },
                      })
                    }
                  >
                    <Text style={styles.headerAction}>Edit</Text>
                  </TouchableOpacity>
                )
              : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPerson} tintColor={palette.tint} />
        }
      >
        {loading && !person ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} />
            <Text style={styles.helperText}>Loading person…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !person ? (
          <Text style={styles.helperText}>Person not found.</Text>
        ) : (
          <View style={styles.card}>
            {renderAvatar(person)}
            <Text style={styles.name}>{formattedPersonName || person.name || ''}</Text>
            <Text style={styles.subtitle}>NRIC: {person.nric}</Text>

            <View style={styles.section}>
              <SectionTitle text="Contact" palette={palette} />
              <InfoRow palette={palette} label="Email" value={person.email} />
              <InfoRow palette={palette} label="Phone" value={person.phone} />
              <InfoRow palette={palette} label="Address" value={person.address} />
            </View>

            <View style={styles.section}>
              <SectionTitle text="Personal" palette={palette} />
              <InfoRow palette={palette} label="Gender" value={person.gender} />
              <InfoRow palette={palette} label="Blood Type" value={person.blood_type} />
              <InfoRow palette={palette} label="Occupation" value={person.occupation} />
              <InfoRow palette={palette} label="Date of Birth" value={person.date_of_birth} />
              <InfoRow
                palette={palette}
                label="Age"
                value={
                  person.age_years !== null && person.age_years !== undefined
                    ? `${person.age_years} ${person.age_years === 1 ? 'year' : 'years'}${
                        person.age_months && person.age_months > 0
                          ? ` ${person.age_months} ${person.age_months === 1 ? 'month' : 'months'}`
                          : ''
                      }`
                    : undefined
                }
              />
            </View>

            <View style={styles.section}>
              <SectionTitle text="Owner" palette={palette} />
              <InfoRow
                palette={palette}
                label="Owner"
                value={formatPersonName(person.owner_name)}
              />
            </View>

            <View style={styles.section}>
              <SectionTitle text="Documents" palette={palette} />
              {documents.length === 0 ? (
                <Text style={[styles.helperText, styles.leftAlignedText]}>No documents uploaded yet.</Text>
              ) : (
                documents.map((doc) => {
                  const actionLabel = getDocumentActionLabel(doc);
                  return (
                    <View key={doc.id} style={styles.documentCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.documentTitle}>{doc.name}</Text>
                      <Text style={styles.documentMeta}>
                        {(doc.original_name ?? 'Unnamed file') + ' · ' + formatFileSize(doc.file_size)}
                      </Text>
                      <View style={styles.chipRow}>
                        <Text
                          style={[
                            styles.documentChip,
                            doc.is_public ? styles.publicChip : styles.privateChip,
                          ]}
                        >
                          {doc.is_public ? 'Public' : 'Private'}
                        </Text>
                      </View>
                      {canManageDocuments && (
                        <View style={styles.visibilitySwitchRow}>
                          <Text style={[styles.switchLabel, { color: palette.text }]}>Public</Text>
                          <Switch
                            value={doc.is_public}
                            onValueChange={(value) => handleToggleDocumentVisibility(doc.id, value)}
                            trackColor={{ false: palette.border, true: palette.tint }}
                            thumbColor={doc.is_public ? palette.tint : '#fff'}
                            disabled={
                              updatingVisibilityId === doc.id ||
                              deletingDocumentId === doc.id
                            }
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.documentActions}>
                      <TouchableOpacity
                        onPress={() => handleOpenDocument(doc.file_url)}
                        style={styles.documentButton}
                      >
                        <Text style={styles.documentButtonText}>{actionLabel}</Text>
                      </TouchableOpacity>
                      {canManageDocuments && (
                        <TouchableOpacity
                          onPress={() => confirmDeleteDocument(doc.id)}
                          style={[styles.documentButton, styles.deleteButton]}
                          disabled={deletingDocumentId === doc.id}
                        >
                          <Text style={styles.deleteButtonText}>
                            {deletingDocumentId === doc.id ? 'Removing…' : 'Delete'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    </View>
                  );
                })
              )}

              {canManageDocuments && (
                <View style={styles.uploadCard}>
                  <Text style={styles.uploadTitle}>Upload a document</Text>
                  <TextInput
                    value={documentName}
                    onChangeText={setDocumentName}
                    placeholder="Document name"
                    placeholderTextColor={palette.textMuted}
                    style={styles.input}
                  />
                  <TouchableOpacity style={styles.fileButton} onPress={handlePickDocument}>
                    <Text style={styles.fileButtonText}>
                      {pickedDocument ? 'Choose another file' : 'Choose a file'}
                    </Text>
                  </TouchableOpacity>
                  {pickedDocument && (
                    <Text style={styles.selectedFile}>
                      {pickedDocument.name ?? 'Selected file'} · {formatFileSize(pickedDocument.size)}
                    </Text>
                  )}
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: palette.text }]}>Make document public</Text>
                    <Switch
                      value={documentIsPublic}
                      onValueChange={setDocumentIsPublic}
                      trackColor={{ false: palette.border, true: palette.tint }}
                      thumbColor={documentIsPublic ? palette.tint : '#fff'}
                    />
                  </View>
                  <Text style={styles.formHelperText}>
                    Allowed files: PDF, JPG, JPEG, PNG up to 5 MB.
                  </Text>
                  {documentError && <Text style={styles.formErrorText}>{documentError}</Text>}
                  <TouchableOpacity
                    style={[
                      styles.uploadButton,
                      (!documentName.trim() || !pickedDocument || uploadingDocument) && styles.buttonDisabled,
                    ]}
                    disabled={!documentName.trim() || !pickedDocument || uploadingDocument}
                    onPress={handleUploadDocument}
                  >
                    <Text style={styles.uploadButtonText}>
                      {uploadingDocument ? 'Uploading…' : 'Upload document'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {canDeletePerson && (
              <View style={styles.dangerCard}>
                <Text style={styles.dangerTitle}>Delete Person</Text>
                <Text style={styles.dangerText}>
                  Deleting this person will permanently remove their profile and all uploaded
                  documents. This action cannot be undone.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.deletePersonButton,
                    deletingPerson && styles.deletePersonButtonDisabled,
                  ]}
                  onPress={confirmDeletePerson}
                  disabled={deletingPerson}
                >
                  <Text style={styles.deletePersonButtonText}>
                    {deletingPerson ? 'Deleting…' : 'Delete person'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const SectionTitle = ({ text, palette }: { text: string; palette: Palette }) => (
  <Text style={[stylesFactory.sectionTitle, { color: palette.text }]}>{text}</Text>
);

const InfoRow = ({
  label,
  value,
  palette,
}: {
  label: string;
  value?: string | number | null;
  palette: Palette;
}) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={stylesFactory.infoRow}>
      <Text style={[stylesFactory.infoLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[stylesFactory.infoValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
};

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: 20,
      paddingBottom: 60,
    },
    centered: {
      alignItems: 'center',
      marginTop: 24,
    },
    helperText: {
      marginTop: 12,
      color: palette.textMuted,
      textAlign: 'center',
    },
    leftAlignedText: {
      textAlign: 'left',
    },
    errorText: {
      marginTop: 12,
      color: palette.danger,
      textAlign: 'center',
    },
    card: {
      backgroundColor: palette.elevated,
      borderRadius: 28,
      padding: 24,
      shadowColor: palette.shadow,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 22,
      elevation: 6,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: palette.tint,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    avatarText: {
      color: '#fff',
      fontSize: 38,
      fontWeight: '700',
    },
    name: {
      marginTop: 20,
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      color: palette.text,
    },
    subtitle: {
      textAlign: 'center',
      color: palette.textMuted,
      marginTop: 6,
    },
    section: {
      marginTop: 26,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 16,
    },
    headerAction: {
      color: palette.tint,
      fontWeight: '600',
      marginRight: 8,
      fontSize: 16,
    },
    documentCard: {
      flexDirection: 'row',
      gap: 12,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      padding: 16,
      backgroundColor: palette.surface,
      marginBottom: 12,
    },
    documentTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
    },
    documentMeta: {
      marginTop: 4,
      color: palette.textMuted,
      fontSize: 13,
    },
    chipRow: {
      flexDirection: 'row',
      marginTop: 8,
    },
    visibilitySwitchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    documentChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: '600',
    },
    publicChip: {
      backgroundColor: 'rgba(123, 200, 164, 0.18)',
      color: palette.success,
    },
    privateChip: {
      backgroundColor: 'rgba(244, 151, 142, 0.18)',
      color: palette.danger,
    },
    documentActions: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
    },
    documentButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
    },
    documentButtonText: {
      color: palette.tint,
      fontWeight: '600',
    },
    deleteButton: {
      borderColor: palette.danger,
    },
    deleteButtonText: {
      color: palette.danger,
      fontWeight: '600',
    },
    uploadCard: {
      marginTop: 20,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.elevated,
    },
    uploadTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: palette.text,
      backgroundColor: palette.surface,
      marginBottom: 12,
    },
    fileButton: {
      backgroundColor: palette.tint,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
    },
    fileButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    selectedFile: {
      marginTop: 8,
      color: palette.textMuted,
      fontSize: 13,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    switchLabel: {
      fontWeight: '500',
      fontSize: 14,
    },
    formHelperText: {
      marginTop: 12,
      color: palette.textMuted,
      fontSize: 12,
    },
    formErrorText: {
      marginTop: 8,
      color: palette.danger,
      fontSize: 13,
    },
    uploadButton: {
      marginTop: 16,
      backgroundColor: palette.tint,
      paddingVertical: 14,
      borderRadius: 18,
      alignItems: 'center',
    },
    uploadButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    dangerCard: {
      marginTop: 28,
      padding: 18,
      borderRadius: 20,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    dangerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.danger,
    },
    dangerText: {
      marginTop: 6,
      color: palette.textMuted,
      lineHeight: 20,
    },
    deletePersonButton: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: palette.danger,
      alignItems: 'center',
    },
    deletePersonButtonDisabled: {
      opacity: 0.7,
    },
    deletePersonButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
  });

const stylesFactory = StyleSheet.create({
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 16,
    marginTop: 2,
  },
});

