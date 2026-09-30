import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { isAxiosError } from "axios"
import {
  createApplicationApi,
  fetchApplicationByIdApi,
  fetchCandidateApplicationsApi,
  fetchJobApplicationsApi,
  fetchRecruiterApplicationsApi,
  updateApplicationStatusApi,
  type Application,
  type ApplicationCreatePayload,
} from "../../utils/api"

export type { Application };

export interface ApplicationsState {
  candidateApplications: Application[];
  jobApplications: Application[];
  isLoading: boolean;
  hasFetchedRecruiterApplications: boolean;
}

const initialState: ApplicationsState = {
  candidateApplications: [],
  jobApplications: [],
  isLoading: false,
  hasFetchedRecruiterApplications: false,
};

export const createApplicationThunk = createAsyncThunk(
  "applications/createApplication",
  async (payload: ApplicationCreatePayload, { rejectWithValue }) => {
    try {
      return await createApplicationApi(payload);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to create application");
      }
      return rejectWithValue("Failed to create application");
    }
  }
);

export const fetchCandidateApplicationsThunk = createAsyncThunk(
  "applications/fetchCandidateApplications",
  async (candidateId: string, { rejectWithValue }) => {
    try {
      return await fetchCandidateApplicationsApi(candidateId);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to fetch applications");
      }
      return rejectWithValue("Failed to fetch applications");
    }
  }
);

export const fetchJobApplicationsThunk = createAsyncThunk(
  "applications/fetchJobApplications",
  async (jobId: string, { rejectWithValue }) => {
    try {
      return await fetchJobApplicationsApi(jobId);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to fetch applications");
      }
      return rejectWithValue("Failed to fetch applications");
    }
  }
);

export const fetchRecruiterApplicationsThunk = createAsyncThunk(
  "applications/fetchRecruiterApplications",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchRecruiterApplicationsApi();
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to fetch applications");
      }
      return rejectWithValue("Failed to fetch applications");
    }
  }
);

export const fetchApplicationByIdThunk = createAsyncThunk(
  "applications/fetchApplicationById",
  async (applicationId: string, { rejectWithValue }) => {
    try {
      return await fetchApplicationByIdApi(applicationId);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to fetch application");
      }
      return rejectWithValue("Failed to fetch application");
    }
  }
);

export const updateApplicationStatusThunk = createAsyncThunk(
  "applications/updateStatus",
  async ({ applicationId, status, reason }: { applicationId: string; status: string; reason?: string | null }, { rejectWithValue }) => {
    try {
      return await updateApplicationStatusApi(applicationId, status, reason);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        return rejectWithValue(error.response?.data?.detail || "Failed to update status");
      }
      return rejectWithValue("Failed to update status");
    }
  }
);

export const applicationsSlice = createSlice({
  name: "applications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createApplicationThunk.fulfilled, (state, action: PayloadAction<Application>) => {
      const exists = state.candidateApplications.some((a) => a.id === action.payload.id);
      if (!exists) {
        state.candidateApplications.unshift(action.payload);
      }
    });

    builder.addCase(fetchCandidateApplicationsThunk.pending, (state) => {
      state.isLoading = true;
    });

    builder.addCase(fetchCandidateApplicationsThunk.fulfilled, (state, action: PayloadAction<Application[]>) => {
      state.candidateApplications = action.payload;
      state.isLoading = false;
    });

    builder.addCase(fetchCandidateApplicationsThunk.rejected, (state) => {
      state.isLoading = false;
    });

    builder.addCase(fetchJobApplicationsThunk.fulfilled, (state, action: PayloadAction<Application[]>) => {
      const existingMap = new Map(state.jobApplications.map((a) => [a.id, a]));
      action.payload.forEach((a) => existingMap.set(a.id, a));
      state.jobApplications = Array.from(existingMap.values());
    });

    builder.addCase(fetchApplicationByIdThunk.fulfilled, (state, action: PayloadAction<Application>) => {
      const jIndex = state.jobApplications.findIndex((a) => a.id === action.payload.id);
      if (jIndex !== -1) {
        state.jobApplications[jIndex] = action.payload;
      } else {
        state.jobApplications.push(action.payload);
      }
      const cIndex = state.candidateApplications.findIndex((a) => a.id === action.payload.id);
      if (cIndex !== -1) {
        state.candidateApplications[cIndex] = action.payload;
      }
    });

    builder.addCase(fetchRecruiterApplicationsThunk.pending, (state) => {
      state.isLoading = true;
    });

    builder.addCase(fetchRecruiterApplicationsThunk.fulfilled, (state, action: PayloadAction<Application[]>) => {
      state.jobApplications = action.payload;
      state.isLoading = false;
      state.hasFetchedRecruiterApplications = true;
    });

    builder.addCase(fetchRecruiterApplicationsThunk.rejected, (state) => {
      state.isLoading = false;
    });

    builder.addCase(updateApplicationStatusThunk.fulfilled, (state, action: PayloadAction<Application>) => {
      const jIndex = state.jobApplications.findIndex((a) => a.id === action.payload.id);
      if (jIndex !== -1) {
        state.jobApplications[jIndex] = action.payload;
      } else {
        state.jobApplications.push(action.payload);
      }
      const cIndex = state.candidateApplications.findIndex((a) => a.id === action.payload.id);
      if (cIndex !== -1) {
        state.candidateApplications[cIndex] = action.payload;
      }
    });
  },
});

export default applicationsSlice.reducer;
