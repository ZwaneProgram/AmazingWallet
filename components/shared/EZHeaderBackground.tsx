import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useAccent } from "../../hooks/useAccent";

const EZHeaderBackground: React.FC<any> = () => {
  const { theme } = useSelector((state: RootState) => state.user);
  const accent = useAccent();

  return (
    <LinearGradient
      colors={theme === "light" ? [accent[900], accent[600]] : ["#111827", "#111827"]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
  );
};

export default EZHeaderBackground;
