import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SettingsState {
  activeTab: string;
  emailTab: string;
  printTab: string;
}

const initialState: SettingsState = {
  activeTab: "General",
  emailTab: "General",
  printTab: "Printer selection",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    setEmailTab(state, action: PayloadAction<string>) {
      state.emailTab = action.payload;
    },
    setPrintTab(state, action: PayloadAction<string>) {
      state.printTab = action.payload;
    },
  },
});

export const { setActiveTab, setEmailTab, setPrintTab } = settingsSlice.actions;
export default settingsSlice.reducer;
