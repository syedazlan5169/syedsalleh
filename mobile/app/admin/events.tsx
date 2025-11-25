import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Palette } from "@/constants/theme";
import { useThemePalette } from "@/context/ThemePreferenceContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/apiClient";

type Event = {
  id: number;
  name: string;
  event_date: string;
  days_until: number | null;
  is_past: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminEventsScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, token } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    if (!isAdmin || !token) {
      return;
    }
    loadEvents();
  }, [isAdmin, token]);

  const loadEvents = async () => {
    if (!token) return;

    try {
      const response = (await apiGet("/api/events", token)) as {
        events: Event[];
      };
      setEvents(response.events || []);
    } catch (err: any) {
      console.error("Error loading events:", err);
      Alert.alert("Error", err?.message || "Failed to load events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setEventName("");
    setEventDate(new Date());
    setShowModal(true);
  };

  const openEditModal = (event: Event) => {
    console.log("Opening edit modal for event:", event);
    setEditingEvent(event);
    setEventName(event.name);
    setEventDate(new Date(event.event_date));
    setShowDatePicker(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setEventName("");
    setEventDate(new Date());
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!token) return;

    if (!eventName.trim()) {
      Alert.alert("Error", "Please enter an event name");
      return;
    }

    try {
      setActionLoading(-1);
      const eventData = {
        name: eventName.trim(),
        event_date: eventDate.toISOString().split("T")[0],
      };

      if (editingEvent) {
        await apiPut(`/api/admin/events/${editingEvent.id}`, token, eventData);
        Alert.alert("Success", "Event updated successfully");
      } else {
        await apiPost("/api/admin/events", token, eventData);
        Alert.alert("Success", "Event created successfully");
      }

      closeModal();
      await loadEvents();
    } catch (err: any) {
      console.error("Error saving event:", err);
      Alert.alert("Error", err?.message || "Failed to save event");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (event: Event) => {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${event.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!token) {
              Alert.alert("Error", "No authentication token");
              return;
            }
            try {
              setActionLoading(event.id);
              console.log("Deleting event:", event.id);
              await apiDelete(`/api/admin/events/${event.id}`, token);
              console.log("Event deleted successfully");
              Alert.alert("Success", "Event deleted successfully");
              await loadEvents();
            } catch (err: any) {
              console.error("Error deleting event:", err);
              const errorMessage = err?.message || "Failed to delete event";
              Alert.alert("Error", errorMessage);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDaysUntil = (days: number | null) => {
    if (days === null) return "Past";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity onPress={openAddModal}>
          <IconSymbol name="plus" size={24} color={palette.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="calendar" size={48} color={palette.textMuted} />
            <Text style={styles.emptyText}>No events yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add an event
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <TouchableOpacity
                style={styles.eventInfoContainer}
                onPress={() => openEditModal(event)}
                disabled={actionLoading === event.id}
                activeOpacity={0.7}
              >
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventDate}>
                    {formatDate(event.event_date)}
                  </Text>
                  <View style={styles.eventMeta}>
                    <View
                      style={[
                        styles.daysBadge,
                        {
                          backgroundColor:
                            event.days_until === null
                              ? palette.danger
                              : event.days_until === 0
                              ? palette.tint
                              : palette.highlight,
                        },
                      ]}
                    >
                      <Text style={styles.daysText}>
                        {formatDaysUntil(event.days_until)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.editIconContainer}>
                  <IconSymbol name="pencil" size={20} color={palette.tint} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  console.log("Delete button pressed for event:", event.id);
                  handleDelete(event);
                }}
                disabled={actionLoading === event.id}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {actionLoading === event.id ? (
                  <ActivityIndicator size="small" color={palette.danger} />
                ) : (
                  <IconSymbol name="trash" size={20} color={palette.danger} />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvent ? "Edit Event" : "Add Event"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <IconSymbol name="xmark" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Event Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter event name"
                placeholderTextColor={palette.textMuted}
                value={eventName}
                onChangeText={setEventName}
              />

              <Text style={styles.inputLabel}>Event Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {eventDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <IconSymbol name="calendar" size={20} color={palette.tint} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setEventDate(selectedDate);
                    } else if (Platform.OS === "android") {
                      setShowDatePicker(false);
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  actionLoading === -1 && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={actionLoading === -1}
              >
                {actionLoading === -1 ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingEvent ? "Update Event" : "Create Event"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: palette.text,
    },
    content: {
      padding: 20,
      gap: 12,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      gap: 12,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
    },
    emptySubtext: {
      fontSize: 14,
      color: palette.textMuted,
    },
    eventCard: {
      flexDirection: "row",
      backgroundColor: palette.elevated,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      alignItems: "center",
    },
    eventInfoContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    eventInfo: {
      flex: 1,
      gap: 4,
    },
    eventName: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
    },
    eventDate: {
      fontSize: 14,
      color: palette.textMuted,
    },
    eventMeta: {
      marginTop: 8,
    },
    daysBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    daysText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#fff",
    },
    editIconContainer: {
      padding: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButton: {
      padding: 12,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 44,
      minHeight: 44,
      backgroundColor: palette.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.danger + "40",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: palette.elevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
    },
    modalBody: {
      gap: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: palette.text,
      backgroundColor: palette.surface,
    },
    dateButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: palette.surface,
    },
    dateButtonText: {
      fontSize: 16,
      color: palette.text,
    },
    saveButton: {
      backgroundColor: palette.tint,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    saveButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
