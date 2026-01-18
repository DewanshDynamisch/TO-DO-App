import { configureStore } from '@reduxjs/toolkit';
import todoReducer from './todos/todoSlice';
import uiReducer from './ui/uiSlice';

export const store = configureStore({
  reducer: {
    todos: todoReducer,
    ui: uiReducer,
  },
});
