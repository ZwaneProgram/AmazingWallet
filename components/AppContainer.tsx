import { extendTheme, NativeBaseProvider } from "native-base";
import React from "react";
import { useSelector } from "react-redux";
import Navigation from "../navigation/Navigation";
import { RootState } from "../redux/store";

const AppContainer: React.FC<any> = () => {
  const user = useSelector((state: RootState) => state.user);

  const isDarkTheme = user.theme === "dark";

  const theme = extendTheme({
    colors: {
      muted: {
        // 50 stays a surface color (dark card bg in dark mode); header text uses an
        // explicit white instead. The text shades (400–900) flip to light in dark mode
        // so secondary text stays readable, while light-mode values are unchanged.
        50: isDarkTheme ? "#374151" : "#fafafa",
        400: isDarkTheme ? "#d1d5db" : "#a3a3a3",
        500: isDarkTheme ? "#e5e7eb" : "#737373",
        600: isDarkTheme ? "#eef2f7" : "#525252",
        700: isDarkTheme ? "#f3f4f6" : "#404040",
        800: isDarkTheme ? "#f9fafb" : "#262626",
        900: isDarkTheme ? "#fafafa" : "#171717",
      },
    },
    config: {
      initialColorMode: user.theme,
    },
  });

  return (
    <NativeBaseProvider theme={theme}>
      <Navigation />
    </NativeBaseProvider>
  );
};

export default AppContainer;
