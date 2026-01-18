import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';

import { setTodos } from '../redux/todos/todoSlice';
import { toggleDarkMode } from '../redux/ui/uiSlice';

import {
  showTaskAddedNotification,
  showTaskUpdatedNotification,
  showTaskDeletedNotification,
} from '../utils/notificationService';

export default function TodoScreen() {
  /*  REDUX  */
  const dispatch = useDispatch();
  const todos = useSelector(state => state.todos.list);
  const darkMode = useSelector(state => state.ui.darkMode);

  const theme = darkMode ? darkTheme : lightTheme;

  /*FORM STATE  */
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  /*  SWIPE*/
  const swipeRefs = useRef({});
  const openSwipeRef = useRef(null);

  const closeAllSwipes = () => {
    Object.values(swipeRefs.current).forEach(ref => {
      try {
        ref?.close();
      } catch {}
    });
    swipeRefs.current = {};
    openSwipeRef.current = null;
  };

  useEffect(() => {
    return () => {
      closeAllSwipes();
    };
  }, []);

  const onSwipeOpen = id => {
    if (openSwipeRef.current && openSwipeRef.current !== id) {
      swipeRefs.current[openSwipeRef.current]?.close();
    }
    openSwipeRef.current = id;
  };

  const closeSwipeOnScroll = () => {
    if (openSwipeRef.current) {
      swipeRefs.current[openSwipeRef.current]?.close();
      openSwipeRef.current = null;
    }
  };

  /*  FIRESTORE LISTENER  */
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('todos')
      .onSnapshot(snapshot => {
        const list = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title,
            note: d.note || '',
            completed: !!d.completed,
            dueDate: d.dueDate ? d.dueDate.toMillis() : null,
          };
        });
        dispatch(setTodos(list));
      });

    return unsubscribe;
  }, [dispatch]);

  /* COMPLETE ALL  */
  const allCompleted =
    todos.length > 0 && todos.every(t => t.completed);

  const toggleAllTasks = async () => {
    const batch = firestore().batch();
    todos.forEach(task => {
      batch.update(
        firestore().collection('todos').doc(task.id),
        { completed: !allCompleted }
      );
    });
    await batch.commit();
  };

  /*  SAVE TASK */
  const saveTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    const payload = {
      title,
      note,
      dueDate: dueDate
        ? firestore.Timestamp.fromDate(dueDate)
        : null,
    };

    if (editingId) {
      await firestore().collection('todos').doc(editingId).update(payload);
      await showTaskUpdatedNotification(title);
    } else {
      await firestore().collection('todos').add({
        ...payload,
        completed: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      await showTaskAddedNotification(title);
    }

    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setNote('');
    setDueDate(null);
    setEditingId(null);
    setShowForm(false);
  };

  /*TASK ACTIONS */
  const toggleTask = task =>
    firestore().collection('todos').doc(task.id).update({
      completed: !task.completed,
    });

  const deleteTask = id =>
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await firestore().collection('todos').doc(id).delete();
          await showTaskDeletedNotification();
        },
      },
    ]);

  /*  DATE SECTIONS (GROUPING) */
  const sections = useMemo(() => {
    const overdue = [];
    const today = [];
    const tomorrow = [];
    const upcoming = [];
    const later = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);

    todos.forEach(t => {
      if (!t.dueDate) {
        later.push(t);
        return;
      }

      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);

      if (d < now) overdue.push(t);
      else if (d.getTime() === now.getTime()) today.push(t);
      else if (d.getTime() === tmr.getTime()) tomorrow.push(t);
      else upcoming.push(t);
    });

    return [
      { title: 'Overdue', data: overdue },
      { title: 'Today', data: today },
      { title: 'Tomorrow', data: tomorrow },
      { title: 'Upcoming', data: upcoming },
      { title: 'Later', data: later },
    ].filter(s => s.data.length);
  }, [todos]);

  /*  SWIPE ACTIONS  */
  const renderRightActions = (progress, dragX, item) => {
    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[styles.actions, { transform: [{ translateX }] }]}
      >
        <TouchableOpacity
          style={[styles.actionBtn, styles.edit]}
          onPress={() => {
            setEditingId(item.id);
            setTitle(item.title);
            setNote(item.note);
            setDueDate(item.dueDate ? new Date(item.dueDate) : null);
            setShowForm(true);
          }}
        >
          <Text>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.delete]}
          onPress={() => {
            closeAllSwipes();
            deleteTask(item.id);
          }}
        >
          <Text>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  /*  RENDER TASK  */
  const renderTask = task => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const isOverdue =
      task.dueDate && new Date(task.dueDate) < todayDate;

    return (
      <View key={task.id} style={styles.swipeWrap}>
        <Swipeable
          ref={ref => (swipeRefs.current[task.id] = ref)}
          onSwipeableWillOpen={() => onSwipeOpen(task.id)}
          renderRightActions={(p, d) =>
            renderRightActions(p, d, task)
          }
          overshootRight={false}
        >
          <View style={[styles.card, theme.card]}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                task.completed && styles.checked,
              ]}
              onPress={() => toggleTask(task)}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.titleText,
                  theme.text,
                  task.completed && styles.done,
                ]}
              >
                {task.title}
              </Text>

              {!!task.note && (
                <Text style={[styles.note, theme.sub]}>
                  {task.note}
                </Text>
              )}

             {!!task.dueDate && (
                <Text
                  style={[
                    styles.date,
                    isOverdue ? styles.overdueText : theme.sub,
                  ]}
                >
                  {isOverdue && ' Overdue • '}
                  Due: {new Date(task.dueDate).toDateString()}
                </Text>
              )}

            </View>
          </View>
        </Swipeable>
      </View>
    );
  };

  /*  ADD / EDIT FORM = */
  if (showForm) {
    return (
      <View style={[styles.container, theme.bg]}>
        <Text style={[styles.formTitle, theme.text]}>
          {editingId ? 'Edit Task' : 'Add Task'}
        </Text>

        <TextInput
          placeholder="Title"
          placeholderTextColor={theme.placeholder}
          value={title}
          onChangeText={setTitle}
          style={[styles.input, theme.card, theme.text]}
        />

        <TextInput
          placeholder="Note"
          placeholderTextColor={theme.placeholder}
          value={note}
          onChangeText={setNote}
          style={[
            styles.input,
            styles.noteInput,
            theme.card,
            theme.text,
          ]}
          multiline
        />

        <TouchableOpacity
          style={[styles.dateBtn, theme.card]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={theme.text}>
            {dueDate ? dueDate.toDateString() : 'Pick Due Date'}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              setShowPicker(false);
              if (d) setDueDate(d);
            }}
          />
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={saveTask}>
          <Text style={{ color: '#fff' }}>
            {editingId ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetForm}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /*  MAIN UI */
  return (
    <View style={[styles.container, theme.bg]}>
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <Text style={[styles.headerText, theme.text]}>
            My Tasks
          </Text>

          <TouchableOpacity onPress={() => dispatch(toggleDarkMode())}>
            <Text>{darkMode ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.completeAllBtn}
        onPress={toggleAllTasks}
      >
        <Text style={styles.completeAllText}>
          {allCompleted ? 'Mark all incomplete' : 'Complete all'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={sections}
        keyExtractor={s => s.title}
        onScrollBeginDrag={closeSwipeOnScroll}
        renderItem={({ item }) => (
          <>
            <Text style={[styles.section, theme.sub]}>
              {item.title}
            </Text>
            {item.data.map(renderTask)}
          </>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          closeAllSwipes();
          setShowForm(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/*  STYLES  */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  headerWrapper: {
    paddingTop: 20,
    paddingBottom: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerText: { fontSize: 28, fontWeight: '700' },

  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 40,
    marginBottom: 24,
  },

  section: {
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  swipeWrap: { marginBottom: 10 },

  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6366F1',
    marginRight: 14,
  },

  checked: { backgroundColor: '#6366F1' },

  titleText: { fontSize: 16, fontWeight: '600' },
  note: { marginTop: 4 },
  date: { marginTop: 4, fontSize: 12 },

  overdueText: {
    color: '#DC2626',
    fontWeight: '700',
  },

  done: { textDecorationLine: 'line-through', opacity: 0.5 },

  actions: { flexDirection: 'row', width: 160 },

  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  edit: { backgroundColor: '#DBEAFE' },
  delete: { backgroundColor: '#FEE2E2' },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 30,
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fabText: { color: '#fff', fontSize: 32 },

  completeAllBtn: {
    marginVertical: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
  },

  completeAllText: {
    color: '#4F46E5',
    fontWeight: '600',
  },

  input: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },

  noteInput: { height: 100 },

  dateBtn: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },

  saveBtn: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  cancel: {
    marginTop: 16,
    textAlign: 'center',
    color: '#6B7280',
  },
});

/* THEMES */
const lightTheme = {
  bg: { backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#FFFFFF' },
  text: { color: '#111827' },
  sub: { color: '#6B7280' },
  placeholder: '#9CA3AF',
};

const darkTheme = {
  bg: { backgroundColor: '#0F172A' },
  card: { backgroundColor: '#1E293B' },
  text: { color: '#E5E7EB' },
  sub: { color: '#94A3B8' },
  placeholder: '#9CA3AF',
};
