import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  HStack,
  VStack,
  Box,
  Pressable,
  ScrollView,
  Modal,
  Spinner,
  Divider,
} from "native-base";
import { SafeAreaView, TouchableOpacity, Alert, Platform } from "react-native";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { StatusBar } from "expo-status-bar";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { Category } from "../interfaces/Category";
import { CategoryService } from "../api/services/CategoryService";
import { categoriesSelector, setCategoriesAction } from "../redux/expensesReducers";
import { renderCategoryIcon, ICON_OPTIONS, COLOR_PALETTE } from "../utils/categoryIcons";
import EZInput from "../components/shared/EZInput";
import EZButton from "../components/shared/EZButton";
import { authInput } from "../commonStyles";

interface CategoryManagerScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

type Mode = "add" | "edit" | "sub";

const CategoryManagerScreen: React.FC<CategoryManagerScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const user: any = useSelector((state: RootState) => state.user);
  const categories = useSelector(categoriesSelector);

  const [loading, setLoading] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("add");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [name, setName] = useState<string>("");
  const [color, setColor] = useState<string>(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0].key);
  const [saving, setSaving] = useState<boolean>(false);

  const refresh = async () => {
    const data = await CategoryService.getUserCategories(user.id);
    dispatch(setCategoriesAction(data));
  };

  const load = async () => {
    setLoading(true);
    await refresh();
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const parents = categories.filter((c: Category) => !c.parentId);
  const childrenOf = (id?: number) => categories.filter((c: Category) => c.parentId === id);

  const openAdd = () => {
    setMode("add");
    setEditingId(null);
    setParentId(null);
    setName("");
    setColor(COLOR_PALETTE[0]);
    setIcon(ICON_OPTIONS[0].key);
    setModalOpen(true);
  };

  const openAddSub = (parent: Category) => {
    setMode("sub");
    setEditingId(null);
    setParentId(parent.id ?? null);
    setName("");
    setColor(parent.color ?? COLOR_PALETTE[0]);
    setIcon(ICON_OPTIONS[0].key);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setMode("edit");
    setEditingId(category.id ?? null);
    setParentId(category.parentId ?? null);
    setName(category.name);
    setColor(category.color ?? COLOR_PALETTE[0]);
    setIcon(category.icon ?? ICON_OPTIONS[0].key);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
  };

  // Alert.alert is a no-op on web, so fall back to the browser dialogs there.
  const notify = (title: string, message?: string) => {
    if (Platform.OS === "web") {
      window.alert(message ? `${title}\n\n${message}` : title);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === "web") {
      if (window.confirm(message ? `${title}\n\n${message}` : title)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      notify("Name required", "Please enter a category name.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && editingId) {
        await CategoryService.updateCategory(editingId, { name: name.trim(), color, icon, parentId });
      } else {
        await CategoryService.createCategory({
          userId: user.id,
          name: name.trim(),
          color,
          icon,
          parentId,
        });
      }
      await refresh();
      closeModal();
    } catch (error) {
      console.log("save category failed:", error);
      notify("Error", "Could not save the category. Please try again.");
      setSaving(false);
    }
  };

  const confirmDelete = (category: Category) => {
    const subs = childrenOf(category.id);
    const message = subs.length
      ? `This also deletes its ${subs.length} sub-categor${subs.length === 1 ? "y" : "ies"}. Continue?`
      : "Delete this category?";
    confirmAction("Delete category", message, () => doDelete(category));
  };

  const seedDefaults = async () => {
    try {
      await CategoryService.seedDefaultCategories(user.id);
      await refresh();
    } catch (error) {
      console.log("seed defaults failed:", error);
      notify("Error", "Could not add the default categories. Please try again.");
    }
  };

  const doDelete = async (category: Category) => {
    try {
      await CategoryService.deleteCategory(category.id!);
      await refresh();
    } catch (error) {
      console.log("delete category failed:", error);
      notify(
        "Could not delete",
        "This category may have transactions linked to it. Reassign or remove them first."
      );
    }
  };

  const CategoryRow: React.FC<{ category: Category; isSub?: boolean }> = ({ category, isSub }) => (
    <HStack
      alignItems="center"
      justifyContent="space-between"
      bg="muted.50"
      borderRadius={14}
      shadow={1}
      px={4}
      py={3}
      ml={isSub ? 8 : 0}>
      <HStack alignItems="center" space={3} flex={1}>
        <Box
          width={isSub ? "34px" : "42px"}
          height={isSub ? "34px" : "42px"}
          borderRadius={14}
          justifyContent="center"
          alignItems="center"
          style={{ backgroundColor: category.color || "#7e22ce" }}>
          {renderCategoryIcon(category.icon, category.name, isSub ? 17 : 22, "#fff")}
        </Box>
        <Text fontFamily="SourceBold" fontSize={isSub ? 15 : 17} numberOfLines={1} flex={1}>
          {category.name}
        </Text>
      </HStack>
      <HStack space={1} alignItems="center">
        {!isSub && (
          <TouchableOpacity onPress={() => openAddSub(category)} style={{ padding: 6 }}>
            <Feather name="plus" size={20} color={COLORS.PURPLE[700]} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => openEdit(category)} style={{ padding: 6 }}>
          <Feather name="edit-2" size={18} color={COLORS.MUTED[500]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(category)} style={{ padding: 6 }}>
          <Feather name="trash-2" size={18} color={COLORS.DANGER[500]} />
        </TouchableOpacity>
      </HStack>
    </HStack>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={user.theme === "dark" ? "light" : "dark"} />
      <View flex={1} pt={12} px={6}>
        <HStack alignItems="center" justifyContent="space-between" mb={4}>
          <Text fontFamily="SourceBold" fontSize={26}>
            Categories
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="close" size={24} color={user.theme === "dark" ? "#fff" : "#111827"} />
          </TouchableOpacity>
        </HStack>

        <Pressable onPress={openAdd} _pressed={{ opacity: 0.7 }} mb={4}>
          <HStack
            bg="purple.700"
            borderRadius={12}
            height="48px"
            alignItems="center"
            justifyContent="center"
            space={2}>
            <Feather name="plus" size={20} color="#fff" />
            <Text fontFamily="SourceBold" fontSize={16} color="white">
              Add category
            </Text>
          </HStack>
        </Pressable>

        {loading ? (
          <View flex={1} justifyContent="center" alignItems="center">
            <Spinner color="purple.700" size="lg" />
          </View>
        ) : categories.length === 0 ? (
          <View flex={1} justifyContent="center" alignItems="center" px={6}>
            <MaterialCommunityIcons name="shape-outline" size={56} color={COLORS.MUTED[300]} />
            <Text fontSize={18} fontFamily="SourceSansPro" color="muted.400" mt={2} mb={5}>
              No categories yet
            </Text>
            <EZButton
              variant="outline"
              onPress={seedDefaults}
              borderColor="purple.700"
              borderRadius={10}
              height="46px"
              px={6}
              _text={{ fontFamily: "SourceBold", fontSize: 15, color: COLORS.PURPLE[700] }}
              leftIcon={<MaterialCommunityIcons name="auto-fix" size={18} color={COLORS.PURPLE[700]} />}>
              Add default categories
            </EZButton>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <VStack space={3}>
              {parents.map((parent: Category) => (
                <VStack key={parent.id} space={2}>
                  <CategoryRow category={parent} />
                  {childrenOf(parent.id).map((child: Category) => (
                    <CategoryRow key={child.id} category={child} isSub />
                  ))}
                </VStack>
              ))}
            </VStack>
          </ScrollView>
        )}
      </View>

      {/* Add / edit form */}
      <Modal isOpen={modalOpen} onClose={closeModal} avoidKeyboard>
        <Modal.Content
          maxWidth="420px"
          width="94%"
          bg={user.theme === "dark" ? "#1f2937" : "white"}>
          <Modal.CloseButton _icon={{ color: user.theme === "dark" ? "#ffffff" : "#262626" }} />
          <Modal.Body>
            <VStack space={4}>
              <HStack alignItems="center" space={3}>
                <Box
                  width="46px"
                  height="46px"
                  borderRadius={16}
                  justifyContent="center"
                  alignItems="center"
                  style={{ backgroundColor: color || "#7e22ce" }}>
                  {renderCategoryIcon(icon, name, 24, "#fff")}
                </Box>
                <Text fontFamily="SourceBold" fontSize={20}>
                  {mode === "edit"
                    ? "Edit category"
                    : mode === "sub"
                    ? "New sub-category"
                    : "New category"}
                </Text>
              </HStack>

              <EZInput
                style={authInput}
                type="text"
                label="Name"
                placeholder="e.g. Groceries"
                value={name}
                onChangeText={setName}
                borderRadius={12}
                borderColor="muted.200"
              />

              <VStack space={2}>
                <Text fontFamily="SourceBold" fontSize={16}>
                  Color
                </Text>
                <Box flexDirection="row" flexWrap="wrap">
                  {COLOR_PALETTE.map((c) => (
                    <Pressable key={c} onPress={() => setColor(c)} m={1}>
                      <Box
                        width="34px"
                        height="34px"
                        borderRadius={17}
                        style={{ backgroundColor: c }}
                        borderWidth={color === c ? 3 : 0}
                        borderColor="muted.900"
                      />
                    </Pressable>
                  ))}
                </Box>
              </VStack>

              <VStack space={2}>
                <Text fontFamily="SourceBold" fontSize={16}>
                  Icon
                </Text>
                <Box flexDirection="row" flexWrap="wrap">
                  {ICON_OPTIONS.map((opt) => {
                    const active = opt.key === icon;
                    return (
                      <Pressable key={opt.key} onPress={() => setIcon(opt.key)} m={1}>
                        <Box
                          width="42px"
                          height="42px"
                          borderRadius={12}
                          justifyContent="center"
                          alignItems="center"
                          bg={active ? "purple.700" : "muted.100"}>
                          {opt.render(20, active ? "#fff" : COLORS.MUTED[600])}
                        </Box>
                      </Pressable>
                    );
                  })}
                </Box>
              </VStack>

              <Divider bg="muted.200" />

              <EZButton
                variant="solid"
                isLoading={saving}
                onPress={save}
                bg="purple.700"
                borderRadius={8}
                height="46px"
                _text={{ fontFamily: "SourceSansPro", fontSize: 16 }}>
                {mode === "edit" ? "Save changes" : "Create"}
              </EZButton>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </SafeAreaView>
  );
};

export default CategoryManagerScreen;
