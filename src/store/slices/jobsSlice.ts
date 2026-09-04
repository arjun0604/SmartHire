import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { JOBS_DATA, type Job } from "../../data/jobs"

export type { Job };

const JOBS_STORAGE_KEY = "smarthire_jobs";

const DEFAULT_JOBS: Job[] = JOBS_DATA;


function loadJobsFromStorage(): Job[] {
  try {
    const data = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(DEFAULT_JOBS));
      return DEFAULT_JOBS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_JOBS;
  }
}

function saveJobsToStorage(jobs: Job[]) {
  try {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  } catch {}
}

interface JobsState {
  jobs: Job[];
  savedJobIds: string[];
  appliedJobIds: string[];
}

const INITIAL_SAVED_KEY = "smarthire_saved_jobs";
const INITIAL_APPLIED_KEY = "smarthire_applied_jobs";

function loadStringArray(key: string): string[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

const initialState: JobsState = {
  jobs: loadJobsFromStorage(),
  savedJobIds: loadStringArray(INITIAL_SAVED_KEY),
  appliedJobIds: loadStringArray(INITIAL_APPLIED_KEY),
};

export const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    addJob: (state, action: PayloadAction<Job>) => {
      state.jobs.unshift(action.payload);
      saveJobsToStorage(state.jobs);
    },
    updateJob: (state, action: PayloadAction<Job>) => {
      const index = state.jobs.findIndex((j) => j.id === action.payload.id);
      if (index !== -1) {
        state.jobs[index] = action.payload;
        saveJobsToStorage(state.jobs);
      }
    },
    deleteJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter((j) => j.id !== action.payload);
      saveJobsToStorage(state.jobs);
    },
    toggleSaveJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      if (state.savedJobIds.includes(jobId)) {
        state.savedJobIds = state.savedJobIds.filter((id) => id !== jobId);
      } else {
        state.savedJobIds.push(jobId);
      }
      localStorage.setItem(INITIAL_SAVED_KEY, JSON.stringify(state.savedJobIds));
    },
    applyToJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      if (!state.appliedJobIds.includes(jobId)) {
        state.appliedJobIds.push(jobId);
        localStorage.setItem(INITIAL_APPLIED_KEY, JSON.stringify(state.appliedJobIds));
      }
      const job = state.jobs.find((j) => j.id === jobId);
      if (job) {
        job.applicantCount += 1;
        saveJobsToStorage(state.jobs);
      }
    },
    withdrawApplication: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      state.appliedJobIds = state.appliedJobIds.filter((id) => id !== jobId);
      localStorage.setItem(INITIAL_APPLIED_KEY, JSON.stringify(state.appliedJobIds));
      const job = state.jobs.find((j) => j.id === jobId);
      if (job && job.applicantCount > 0) {
        job.applicantCount -= 1;
        saveJobsToStorage(state.jobs);
      }
    },
  },
});

export const { addJob, updateJob, deleteJob, toggleSaveJob, applyToJob, withdrawApplication } = jobsSlice.actions;
export default jobsSlice.reducer;
