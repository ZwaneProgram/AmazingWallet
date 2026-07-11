import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { AccentRamp, buildAccentRamp, DEFAULT_ACCENT } from "../utils/accent";

// Returns the user's accent shade ramp (50–900), recomputed when the accent
// changes. Use this anywhere a raw hex is needed (gradients, vector-icon colors,
// inline styles) so those stay in sync with the native-base `purple.*` token
// override applied in AppContainer.
export const useAccent = (): AccentRamp => {
  const accentColor = useSelector((state: RootState) => state.user.accentColor);
  return useMemo(() => buildAccentRamp(accentColor || DEFAULT_ACCENT), [accentColor]);
};
