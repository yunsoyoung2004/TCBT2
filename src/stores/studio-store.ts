import { create } from "zustand";
import type { ProtocolStep } from "@/types";

type ViewMode = "grid" | "table";

interface StudioState {
  selectedStepId: string;
  assetView: ViewMode;
  commandOpen: boolean;
  inspectorOpen: boolean;
  unsaved: boolean;
  setSelectedStepId: (id: string) => void;
  setAssetView: (mode: ViewMode) => void;
  setCommandOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setUnsaved: (value: boolean) => void;
  localSteps: ProtocolStep[];
  setLocalSteps: (steps: ProtocolStep[]) => void;
  updateLocalStep: (step: ProtocolStep) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  selectedStepId:"STEP-03",
  assetView:"grid",
  commandOpen:false,
  inspectorOpen:true,
  unsaved:false,
  localSteps:[],
  setSelectedStepId:(selectedStepId) => set({selectedStepId, inspectorOpen:true}),
  setAssetView:(assetView) => set({assetView}),
  setCommandOpen:(commandOpen) => set({commandOpen}),
  setInspectorOpen:(inspectorOpen) => set({inspectorOpen}),
  setUnsaved:(unsaved) => set({unsaved}),
  setLocalSteps:(localSteps) => set({localSteps}),
  updateLocalStep:(step) => set((state) => ({
    localSteps:state.localSteps.map((item) => item.id === step.id ? step : item),
    unsaved:true
  }))
}));
