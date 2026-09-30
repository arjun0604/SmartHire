import { configureStore } from "@reduxjs/toolkit"
import { type TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"
import jobsReducer from "./slices/jobsSlice"
import applicationsReducer from "./slices/applicationsSlice"

export const store = configureStore({
  reducer: {
    jobs: jobsReducer,
    applications: applicationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
