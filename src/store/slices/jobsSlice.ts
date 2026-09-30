import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { isAxiosError } from "axios"
import type { Job } from "../../data/jobs"
import {
  fetchJobsApi,
  fetchRecruiterJobsApi,
  fetchJobByIdApi,
  createJobApi,
  updateJobApi,
  deleteJobApi,
} from "../../utils/api"

export type { Job };

export interface JobsState {
  jobs: Job[];
  isLoading: boolean;
  hasFetchedJobs: boolean;
  recruiterJobs: Job[];
  isRecruiterLoading: boolean;
  hasFetchedRecruiterJobs: boolean;
}

const initialState: JobsState = {
  jobs: [],
  isLoading: false,
  hasFetchedJobs: false,
  recruiterJobs: [],
  isRecruiterLoading: false,
  hasFetchedRecruiterJobs: false,
};

export const fetchJobsThunk = createAsyncThunk<
  Job[],
  { status?: string; force?: boolean } | void,
  { state: { jobs: JobsState } }
>(
  "jobs/fetchJobs",
  async (params, { rejectWithValue }) => {
    try {
      const apiParams = params?.status ? { status: params.status } : undefined;
      return await fetchJobsApi(apiParams);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to fetch jobs");
      }
      return rejectWithValue("Failed to fetch jobs");
    }
  },
  {
    condition: (params, { getState }) => {
      const { jobs } = getState();
      if (jobs.isLoading) {
        return false;
      }
      if (params?.force) {
        return true;
      }
      if (jobs.hasFetchedJobs || jobs.jobs.length > 0) {
        return false;
      }
    },
  }
);

export const fetchRecruiterJobsThunk = createAsyncThunk<
  Job[],
  { status?: string; force?: boolean } | void,
  { state: { jobs: JobsState } }
>(
  "jobs/fetchRecruiterJobs",
  async (params, { rejectWithValue }) => {
    try {
      const apiParams = params ? { status: params.status } : undefined;
      return await fetchRecruiterJobsApi(apiParams);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to fetch recruiter jobs");
      }
      return rejectWithValue("Failed to fetch recruiter jobs");
    }
  },
  {
    condition: (params, { getState }) => {
      const { jobs } = getState();
      if (jobs.isRecruiterLoading) {
        return false;
      }
      if (params?.force) {
        return true;
      }
      if (jobs.hasFetchedRecruiterJobs) {
        return false;
      }
    },
  }
);

export const createJobThunk = createAsyncThunk(
  "jobs/createJob",
  async (jobData: Partial<Job>, { rejectWithValue }) => {
    try {
      return await createJobApi(jobData);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to create job");
      }
      return rejectWithValue("Failed to create job");
    }
  }
);

export const updateJobThunk = createAsyncThunk(
  "jobs/updateJob",
  async ({ jobId, jobData }: { jobId: string; jobData: Partial<Job> }, { rejectWithValue }) => {
    try {
      return await updateJobApi(jobId, jobData);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to update job");
      }
      return rejectWithValue("Failed to update job");
    }
  }
);

export const fetchJobByIdThunk = createAsyncThunk<
  Job,
  string,
  { state: { jobs: JobsState } }
>(
  "jobs/fetchJobById",
  async (jobId, { rejectWithValue }) => {
    try {
      return await fetchJobByIdApi(jobId);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to fetch job");
      }
      return rejectWithValue("Failed to fetch job");
    }
  }
);

export const deleteJobThunk = createAsyncThunk<
  string,
  string,
  { state: { jobs: JobsState } }
>(
  "jobs/deleteJob",
  async (jobId, { rejectWithValue }) => {
    try {
      await deleteJobApi(jobId);
      return jobId;
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to delete job");
      }
      return rejectWithValue("Failed to delete job");
    }
  }
);

export const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchJobsThunk.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchJobsThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.jobs = action.payload;
      state.hasFetchedJobs = true;
    });
    builder.addCase(fetchJobsThunk.rejected, (state) => {
      state.isLoading = false;
      state.hasFetchedJobs = true;
    });

    builder.addCase(fetchRecruiterJobsThunk.pending, (state) => {
      state.isRecruiterLoading = true;
    });
    builder.addCase(fetchRecruiterJobsThunk.fulfilled, (state, action) => {
      state.isRecruiterLoading = false;
      state.recruiterJobs = action.payload;
      state.hasFetchedRecruiterJobs = true;
    });
    builder.addCase(fetchRecruiterJobsThunk.rejected, (state) => {
      state.isRecruiterLoading = false;
      state.hasFetchedRecruiterJobs = true;
    });

    builder.addCase(createJobThunk.fulfilled, (state, action) => {
      state.jobs.unshift(action.payload);
      state.recruiterJobs.unshift(action.payload);
    });

    builder.addCase(updateJobThunk.fulfilled, (state, action) => {
      const index = state.jobs.findIndex((j) => j.id === action.payload.id);
      if (index !== -1) {
        state.jobs[index] = action.payload;
      }
      const rIndex = state.recruiterJobs.findIndex((j) => j.id === action.payload.id);
      if (rIndex !== -1) {
        state.recruiterJobs[rIndex] = action.payload;
      }
    });

    builder.addCase(fetchJobByIdThunk.fulfilled, (state, action) => {
      const index = state.jobs.findIndex((j) => j.id === action.payload.id);
      if (index !== -1) {
        state.jobs[index] = action.payload;
      } else {
        state.jobs.push(action.payload);
      }
      const rIndex = state.recruiterJobs.findIndex((j) => j.id === action.payload.id);
      if (rIndex !== -1) {
        state.recruiterJobs[rIndex] = action.payload;
      } else {
        state.recruiterJobs.push(action.payload);
      }
    });

    builder.addCase(deleteJobThunk.fulfilled, (state, action) => {
      state.jobs = state.jobs.filter((j) => j.id !== action.payload);
      state.recruiterJobs = state.recruiterJobs.filter((j) => j.id !== action.payload);
    });
  },
});

export default jobsSlice.reducer;
