import React, { useState, useEffect, useRef } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { VStack, Text, Pressable, Icon } from "native-base";
import { Feather } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import {
  setCurrency,
  setUser,
  setActiveWalletAction,
  setCycleStartDayAction,
  setMonthAction,
  setYearAction,
} from "../redux/userReducer";
import { getCurrentPeriod } from "../utils/period";
import { setWalletsAction, setWalletGroupsAction } from "../redux/expensesReducers";
import { WalletService } from "../api/services/WalletService";
import { WalletGroupService } from "../api/services/WalletGroupService";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { UserService } from "../api/services/UserService";
import { Provider } from "../interfaces/Provider";
import { useFormik } from "formik";
import { loginSchema } from "../schemas/loginSchema";
import EZInput from "./shared/EZInput";
import COLORS from "../colors";
import EZButton from "./shared/EZButton";
import { useAccent } from "../hooks/useAccent";
import { authInput } from "../commonStyles";

interface LoginFormProps {
  navigation: NavigationProp<ParamListBase>;
}

const LoginForm: React.FC<LoginFormProps> = ({ navigation }) => {
  const passwordRef = useRef(null);
  const accent = useAccent();

  const [passwordVisilble, setPasswordVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      const { email, password } = values;
      const response = await UserService.loginUser(email, password, Provider.DIRECT);
      const message: any = response.message;
      if (message === "User exists") {
        const { id, first_name, last_name, email, currency_code, currency_symbol, cycle_start_day } =
          response.data;

        dispatch(setUser({ firstName: first_name, lastName: last_name, email, id }));

        // Apply the saved billing-cycle start day, then snap the viewing period to
        // whichever accounting month "now" falls in under that cycle.
        const cycleStartDay = cycle_start_day ?? 1;
        dispatch(setCycleStartDayAction(cycleStartDay));
        const { month, year } = getCurrentPeriod(cycleStartDay);
        dispatch(setMonthAction(month));
        dispatch(setYearAction(year));

        const [userWallets, userGroups] = await Promise.all([
          WalletService.getUserWallets(id),
          WalletGroupService.getUserGroups(id),
        ]);
        dispatch(setWalletsAction(userWallets));
        dispatch(setWalletGroupsAction(userGroups));
        const defaultWallet = userWallets.find((w) => w.isDefault) ?? userWallets[0];
        if (defaultWallet?.id) {
          dispatch(setActiveWalletAction(defaultWallet.id));
        }

        if (!currency_code || !currency_symbol) {
          navigation.navigate("Currency");
        } else {
          dispatch(setCurrency({ name: currency_code, symbol: currency_symbol }));
          navigation.navigate("Tabs", { screen: "Home" });
        }
      } else {
        Alert.alert("Error", message);
      }
    },
  });

  useEffect(() => {
    navigation.addListener("focus", () => {
      formik.resetForm();
      setPasswordVisible(false);
    });
  }, [navigation]);

  const dispatch = useDispatch();

  const togglePasswordVisible = () => {
    setPasswordVisible((prevValue) => !prevValue);
  };

  const login = async () => {
    setLoading(true);
    await submitForm();
    setLoading(false);
  };

  const handleValue = (label: string, value: string) => {
    formik.setFieldValue(label, value);
  };

  const focusNextInput = (nextInputRef: any) => {
    nextInputRef.current.focus();
  };

  const goToForgotPassword = () => {
    navigation.navigate("ResetPassword");
  };

  const { values, errors, touched, submitForm } = formik;

  return (
    <VStack space={10}>
      <VStack>
        <Text fontFamily="SourceBold" fontSize={35} textAlign="center">
          Welcome to AmazingWallet
        </Text>
        <Text textAlign="center" fontFamily="SourceSansPro" fontSize={17} color={COLORS.MUTED[400]}>
          Sign in to your account
        </Text>
      </VStack>
      <VStack space={6}>
        <EZInput
          style={authInput}
          borderRadius="12px"
          borderColor="muted.200"
          label="Email address"
          returnKeyType="next"
          type="text"
          value={values.email}
          placeholder="Enter your email"
          onChangeText={(e: string) => handleValue("email", e)}
          error={touched.email && errors.email}
          onSubmitEditing={() => {
            focusNextInput(passwordRef);
          }}
        />
        <EZInput
          style={authInput}
          label="Password"
          returnKeyType="done"
          ref={passwordRef}
          type={passwordVisilble ? "text" : "password"}
          value={values.password}
          placeholder="Password"
          onChangeText={(e: string) => handleValue("password", e)}
          borderRadius="12px"
          borderColor="muted.200"
          error={touched.password && errors.password}
          InputRightElement={
            <Pressable mr={4} onPress={togglePasswordVisible}>
              <Icon
                size={5}
                color={COLORS.MUTED[400]}
                as={<Feather name={passwordVisilble ? "eye" : "eye-off"} />}
              />
            </Pressable>
          }
        />
        <TouchableOpacity onPress={goToForgotPassword}>
          <Text fontFamily="SourceBold" textAlign="right" fontSize={17} color="purple.700">
            Forgot your password ?
          </Text>
        </TouchableOpacity>
      </VStack>

      <EZButton
        variant="solid"
        isLoading={loading}
        onPress={login}
        bg="purple.700"
        borderRadius={8}
        height="44px"
        _text={{ fontFamily: "SourceSansPro", fontSize: 17 }}
        _pressed={{ backgroundColor: accent[700], opacity: 0.7 }}>
        Sign in
      </EZButton>
    </VStack>
  );
};

export default LoginForm;
