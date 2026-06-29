import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Fragment, useRef, useEffect } from "react";
import COLORS from "../colors";
import { TAB_BAR_HEIGHT } from "../constants/NavigationConstants";
import HomeScreen from "../screens/HomeScreen";
import { Ionicons } from "@expo/vector-icons";
import GraphScreen from "../screens/GraphScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { Animated, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EZHeaderBackground from "../components/shared/EZHeaderBackground";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useAccent } from "../hooks/useAccent";

const Tab = createBottomTabNavigator();

const TabNavigator: React.FC<any> = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabOffsetValue = useRef(new Animated.Value(0)).current;
  const user = useSelector((state: RootState) => state.user);

  const tabWidth = width / 4;
  // Real bar height = compact content height + the device's bottom inset
  // (gesture bar / nav buttons). Keeps the bar slim on phones without an inset.
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;
  const isDark = user.theme === "dark";
  const accent = useAccent();
  const activeColor = isDark ? accent[400] : accent[700];
  const inactiveColor = isDark ? COLORS.MUTED[300] : COLORS.MUTED[500];

  const animateTabOffset = (index: number) => {
    Animated.spring(tabOffsetValue, {
      toValue: tabWidth * index,
      speed: 20,
      useNativeDriver: true,
    }).start();
  };

  const resetOffset = () => {
    Animated.spring(tabOffsetValue, {
      toValue: 0,
      speed: 0,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    resetOffset();
  }, [user.id]);

  return (
    <Fragment>
      <Tab.Navigator
        screenOptions={{
          unmountOnBlur: true,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,

          tabBarLabelStyle: {
            fontFamily: "SourceBold",
            fontSize: 11,
            marginBottom: 2,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          tabBarStyle: {
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: insets.bottom + 4,
            backgroundColor: isDark ? "#1f2937" : "#ffffff",
            borderTopWidth: 0,
            // Soft lift so the bar reads as a floating surface, not a hairline.
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: isDark ? 0.3 : 0.07,
            shadowRadius: 16,
            elevation: 12,
          },
          headerBackground: () => <EZHeaderBackground />,
        }}>
        <Tab.Screen
          component={HomeScreen}
          name="Home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={focused ? activeColor : inactiveColor}
              />
            ),
          }}
          listeners={() => ({
            tabPress: () => animateTabOffset(0),
          })}
        />
        <Tab.Screen
          component={GraphScreen}
          name="Graph"
          options={{
            title: "Graph",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "pie-chart" : "pie-chart-outline"}
                size={24}
                color={focused ? activeColor : inactiveColor}
              />
            ),
          }}
          listeners={() => ({
            tabPress: () => animateTabOffset(1),
          })}
        />
        <Tab.Screen
          component={TransactionsScreen}
          name="History"
          options={{
            title: "History",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "time" : "time-outline"}
                size={24}
                color={focused ? activeColor : inactiveColor}
              />
            ),
          }}
          listeners={() => ({
            tabPress: () => animateTabOffset(2),
          })}
        />
        <Tab.Screen
          component={SettingsScreen}
          name="Settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={24}
                color={focused ? activeColor : inactiveColor}
              />
            ),
          }}
          listeners={() => ({
            tabPress: () => animateTabOffset(3),
          })}
        />
      </Tab.Navigator>
      <Animated.View
        style={{
          width: tabWidth * 0.42,
          height: 4,
          marginLeft: tabWidth * 0.29,
          backgroundColor: activeColor,
          position: "absolute",
          borderRadius: 50,
          bottom: tabBarHeight - 4,
          transform: [{ translateX: tabOffsetValue }],
        }}
      />
    </Fragment>
  );
};

export default TabNavigator;
