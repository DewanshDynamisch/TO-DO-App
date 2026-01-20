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

export default function TodoScreen({ user, onLogout }) {
  const dispatch = useDispatch();
  const todos = useSelector(state => state.todos.list);
  const darkMode = useSelector(state => state.ui.darkMode);

  const theme = darkMode ? darkTheme : lightTheme;
  const userId = user.userId;

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const swipeRefs = useRef({});

  /*  FIRESTORE  */

  // useEffect(() => {
  //   if (!userId) return;

  //   const unsub = firestore()
  //     .collection('todos')
  //     .doc(userId)
  //     .collection('tasks')
  //     .onSnapshot(snapshot => {
  //       const list = snapshot.docs.map(doc => {
  //         const d = doc.data();
  //         return {
  //           id: doc.id,
  //           ...d,
  //           dueDate: d.dueDate ? d.dueDate.toMillis() : null,
  //         };
  //       });

  //       dispatch(setTodos(list));
  //     });

  //   return unsub;
  // }, [userId]);

  useEffect(() => {
    if (!user?.userId) return;

    const unsub = firestore()
      .collection('todos')
      .doc(user.userId)
      .collection('tasks')
      .onSnapshot(snapshot => {
        const list = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            dueDate: d.dueDate ? d.dueDate.toMillis() : null,
            createdAt: d.createdAt ? d.createdAt.toMillis() : null,
          };
        });

        dispatch(setTodos(list));
    });

  return unsub;
 }, [user?.userId]);


  /* COMPLETE ALL */

  const allCompleted =
    todos.length > 0 && todos.every(t => t.completed);

  const toggleAll = async () => {
    const batch = firestore().batch();
    todos.forEach(t => {
      batch.update(
        firestore()
          .collection('todos')
          .doc(userId)
          .collection('tasks')
          .doc(t.id),
        { completed: !allCompleted }
      );
    });
    await batch.commit();
  };

  const deleteAllCompleted = () => {
    Alert.alert('Delete All', 'Delete all completed tasks?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const batch = firestore().batch();
          todos.forEach(t => {
            if (t.completed) {
              batch.delete(
                firestore()
                  .collection('todos')
                  .doc(userId)
                  .collection('tasks')
                  .doc(t.id)
              );
            }
          });
          await batch.commit();
        },
      },
    ]);
  };

  /* CRUD */

  const saveTask = async () => {
    if (!title.trim()) return Alert.alert('Title required');

    const payload = {
      title,
      note,
      dueDate: dueDate
        ? firestore.Timestamp.fromDate(dueDate)
        : null,
    };

    if (editingId) {
      await firestore()
        .collection('todos')
        .doc(userId)
        .collection('tasks')
        .doc(editingId)
        .update(payload);

      showTaskUpdatedNotification(title);
    } else {
      await firestore()
        .collection('todos')
        .doc(userId)
        .collection('tasks')
        .add({
          ...payload,
          completed: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      showTaskAddedNotification(title);
    }

    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setTitle('');
    setNote('');
    setDueDate(null);
    setEditingId(null);
  };

  const toggleTask = task =>
    firestore()
      .collection('todos')
      .doc(userId)
      .collection('tasks')
      .doc(task.id)
      .update({ completed: !task.completed });

  const deleteTask = id => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await firestore()
            .collection('todos')
            .doc(userId)
            .collection('tasks')
            .doc(id)
            .delete();

          showTaskDeletedNotification();
        },
      },
    ]);
  };

  /* GROUPING */

  const sections = useMemo(() => {
    if (!todos.length) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups = {
      Overdue: [],
      Today: [],
      Upcoming: [],
      Later: [],
    };

    todos.forEach(t => {
      if (!t.dueDate) return groups.Later.push(t);

      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);

      if (d < today) groups.Overdue.push(t);
      else if (d.getTime() === today.getTime())
        groups.Today.push(t);
      else groups.Upcoming.push(t);
    });

    return Object.entries(groups)
      .filter(([, v]) => v.length)
      .map(([title, data]) => ({ title, data }));
  }, [todos]);

  /* SWIPE */

  const renderRightActions = (progress, dragX, task) => {
    const translateX = dragX.interpolate({
      inputRange: [-150, 0],
      outputRange: [0, 150],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[styles.actions, { transform: [{ translateX }] }]}
      >
        <TouchableOpacity
          style={[styles.actionBtn, styles.edit]}
          onPress={() => {
            swipeRefs.current[task.id]?.close();
            setEditingId(task.id);
            setTitle(task.title);
            setNote(task.note);
            setDueDate(task.dueDate ? new Date(task.dueDate) : null);
            setShowForm(true);
          }}
        >
          <Text>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.delete]}
          onPress={() => {
            swipeRefs.current[task.id]?.close();
            deleteTask(task.id);
          }}
        >
          <Text>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderTask = task => (
    <Swipeable
      ref={r => (swipeRefs.current[task.id] = r)}
      renderRightActions={(p, d) =>
        renderRightActions(p, d, task)
      }
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
            <Text style={theme.sub}>{task.note}</Text>
          )}
        </View>
      </View>
    </Swipeable>
  );

  /*  FORM  */

  if (showForm) {
    return (
      <View style={[styles.container, theme.bg]}>
        <Text style={[styles.formTitle, theme.text]}>
          {editingId ? 'Edit Task' : 'Add Task'}
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={darkMode ? '#94A3B8' : '#6B7280'}
          style={[styles.input, theme.card,
            { color: theme.text.color }
          ]}
        />

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note"
          multiline
          placeholderTextColor={darkMode ? '#94A3B8' : '#6B7280'}
          style={[styles.input, styles.noteInput, theme.card,
            { color: theme.text.color }
          ]}
        />

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowPicker(true)}
        >
          <Text  style={{ color: theme.text.color }}>
            {dueDate ? dueDate.toDateString() : 'Pick Date'}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            onChange={(_, d) => {
              setShowPicker(false);
              if (d) setDueDate(d);
            }}
          />
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={saveTask}>
          <Text style={{ color: '#fff' }}>Save</Text>
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
      <View style={styles.header}>
        <Text style={[styles.headerText, theme.text]}>
          My Tasks
        </Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={() => dispatch(toggleDarkMode())}>
            <Text style={theme.text}>
              {darkMode ? 'Light' : 'Dark'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {todos.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, theme.text]}>
            No tasks yet 
          </Text>
          <Text style={theme.sub}>
            Tap + to add your first task
          </Text>
        </View>
      )}

      {todos.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={toggleAll}
          >
            <Text style={styles.completeText}>
              {allCompleted ? 'Undo All' : 'Complete All'}
            </Text>
          </TouchableOpacity>

          {allCompleted && (
            <TouchableOpacity
              style={styles.deleteAll}
              onPress={deleteAllCompleted}
            >
              <Text style={{ color: '#fff' }}>Delete All</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={sections}
            keyExtractor={item => item.title}
            renderItem={({ item }) => (
              <>
                <Text style={[styles.section, theme.sub]}>
                  {item.title}
                </Text>
                {item.data.map(task => (
                  <View key={task.id}>{renderTask(task)}</View>
                ))}
              </>
            )}
          />
        </>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/*  STYLES  */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { fontSize: 28, fontWeight: '700' },
  logout: { color: 'red' },

  emptyState: { marginTop: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '700' },

  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    borderColor: '#6366F1',
    marginRight: 14,
  },

  checked: { backgroundColor: '#6366F1' },

  titleText: { fontSize: 16, fontWeight: '600' },
  done: { textDecorationLine: 'line-through', opacity: 0.5 },

  actions: { width: 150, flexDirection: 'row' },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  edit: { backgroundColor: '#DBEAFE' },
  delete: { backgroundColor: '#FEE2E2' },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#6366F1',
    height: 56,
    width: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fabText: { color: '#fff', fontSize: 30 },

  completeBtn: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
  },

  completeText: { textAlign: 'center', fontWeight: '600' },

  deleteAll: {
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  input: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },

  noteInput: { height: 100 },

  dateBtn: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
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

  formTitle: { fontSize: 28, fontWeight: '700' },
});

const lightTheme = {
  bg: { backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#fff' },
  text: { color: '#111' },
  sub: { color: '#666' },
};

const darkTheme = {
  bg: { backgroundColor: '#0F172A' },
  card: { backgroundColor: '#1E293B' },
  text: { color: '#E5E7EB' },
  sub: { color: '#94A3B8' },
};
