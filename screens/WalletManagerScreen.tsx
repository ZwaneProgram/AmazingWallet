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
  Badge,
  Switch,
} from "native-base";
import { SafeAreaView, TouchableOpacity, Alert, Platform } from "react-native";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { StatusBar } from "expo-status-bar";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { Wallet, WalletGroup } from "../interfaces/Wallet";
import { WalletService } from "../api/services/WalletService";
import { WalletGroupService } from "../api/services/WalletGroupService";
import { setWalletsAction, setWalletGroupsAction } from "../redux/expensesReducers";
import { setActiveWalletAction } from "../redux/userReducer";
import { renderCategoryIcon, ICON_OPTIONS, COLOR_PALETTE } from "../utils/categoryIcons";
import EZInput from "../components/shared/EZInput";
import EZButton from "../components/shared/EZButton";
import { authInput } from "../commonStyles";
import { useAccent } from "../hooks/useAccent";

interface WalletManagerScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

type Mode = "add" | "edit";

const WalletManagerScreen: React.FC<WalletManagerScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const user: any = useSelector((state: RootState) => state.user);
  const accent = useAccent();

  const [loading, setLoading] = useState<boolean>(true);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [groups, setGroups] = useState<WalletGroup[]>([]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("add");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState<string>("");
  const [color, setColor] = useState<string>(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0].key);
  const [excludeFromTotal, setExcludeFromTotal] = useState<boolean>(false);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Group add/edit modal
  const [groupModalOpen, setGroupModalOpen] = useState<boolean>(false);
  const [groupMode, setGroupMode] = useState<Mode>("add");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [groupColor, setGroupColor] = useState<string>(COLOR_PALETTE[0]);
  const [groupIcon, setGroupIcon] = useState<string>(ICON_OPTIONS[0].key);
  const [groupSaving, setGroupSaving] = useState<boolean>(false);

  // Password-confirmation delete state
  const [pwWallet, setPwWallet] = useState<Wallet | null>(null);
  const [pwValue, setPwValue] = useState<string>("");
  const [pwConfirming, setPwConfirming] = useState<boolean>(false);

  const refresh = async () => {
    const [ws, gs] = await Promise.all([
      WalletService.getUserWallets(user.id),
      WalletGroupService.getUserGroups(user.id),
    ]);
    setWallets(ws);
    setGroups(gs);
    dispatch(setWalletsAction(ws));
    dispatch(setWalletGroupsAction(gs));
  };

  const load = async () => {
    setLoading(true);
    await refresh();
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const maybeFixActive = (deleted: Wallet) => {
    if (deleted.id === user.activeWalletId) {
      WalletService.getUserWallets(user.id).then((freshWallets) => {
        const defaultWallet = freshWallets.find((w) => w.isDefault);
        const fallback = defaultWallet ?? freshWallets[0];
        if (fallback?.id) {
          dispatch(setActiveWalletAction(fallback.id));
        }
      });
    }
  };

  const openAdd = (presetGroupId: number | null = null) => {
    setMode("add");
    setEditingId(null);
    setName("");
    setColor(COLOR_PALETTE[0]);
    setIcon(ICON_OPTIONS[0].key);
    setExcludeFromTotal(false);
    setGroupId(presetGroupId);
    setModalOpen(true);
  };

  const openEdit = (wallet: Wallet) => {
    setMode("edit");
    setEditingId(wallet.id ?? null);
    setName(wallet.name);
    setColor(wallet.color ?? COLOR_PALETTE[0]);
    setIcon(wallet.icon ?? ICON_OPTIONS[0].key);
    setExcludeFromTotal(wallet.excludeFromTotal ?? false);
    setGroupId(wallet.groupId ?? null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
  };

  const save = async () => {
    if (!name.trim()) {
      notify("Name required", "Please enter a wallet name.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && editingId) {
        await WalletService.updateWallet(editingId, {
          name: name.trim(),
          color,
          icon,
          excludeFromTotal,
          groupId,
        });
      } else {
        await WalletService.createWallet({
          userId: user.id,
          name: name.trim(),
          color,
          icon,
          excludeFromTotal,
          groupId,
        });
      }
      await refresh();
      closeModal();
    } catch (error) {
      console.log("save wallet failed:", error);
      notify("Error", "Could not save the wallet. Please try again.");
      setSaving(false);
    }
  };

  // --- Groups ---------------------------------------------------------------
  const openAddGroup = () => {
    setGroupMode("add");
    setEditingGroupId(null);
    setGroupName("");
    setGroupColor(COLOR_PALETTE[0]);
    setGroupIcon(ICON_OPTIONS[0].key);
    setGroupModalOpen(true);
  };

  const openEditGroup = (group: WalletGroup) => {
    setGroupMode("edit");
    setEditingGroupId(group.id ?? null);
    setGroupName(group.name);
    setGroupColor(group.color ?? COLOR_PALETTE[0]);
    setGroupIcon(group.icon ?? ICON_OPTIONS[0].key);
    setGroupModalOpen(true);
  };

  const saveGroup = async () => {
    if (!groupName.trim()) {
      notify("Name required", "Please enter a group name.");
      return;
    }
    setGroupSaving(true);
    try {
      if (groupMode === "edit" && editingGroupId) {
        await WalletGroupService.updateGroup(editingGroupId, {
          name: groupName.trim(),
          color: groupColor,
          icon: groupIcon,
        });
      } else {
        await WalletGroupService.createGroup({
          userId: user.id,
          name: groupName.trim(),
          color: groupColor,
          icon: groupIcon,
        });
      }
      await refresh();
      setGroupModalOpen(false);
      setGroupSaving(false);
    } catch (error) {
      console.log("save group failed:", error);
      notify("Error", "Could not save the group. Please try again.");
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = (group: WalletGroup) => {
    const doDelete = async () => {
      try {
        await WalletGroupService.deleteGroup(group.id!);
        await refresh();
      } catch (error) {
        console.log("delete group failed:", error);
        notify("Error", "Could not delete the group. Please try again.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete group "${group.name}"? Its wallets will become ungrouped.`)) {
        doDelete();
      }
    } else {
      Alert.alert("Delete group", `Delete "${group.name}"? Its wallets will become ungrouped.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleSetDefault = async (wallet: Wallet) => {
    try {
      await WalletService.setDefaultWallet(user.id, wallet.id!);
      await refresh();
    } catch (error) {
      console.log("set default wallet failed:", error);
      notify("Error", "Could not set the default wallet. Please try again.");
    }
  };

  // Alert.alert is a no-op on web, so fall back to the browser dialog there.
  const notify = (title: string, message?: string) => {
    if (Platform.OS === "web") {
      window.alert(message ? `${title}\n\n${message}` : title);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleDelete = async (wallet: Wallet) => {
    const res = await WalletService.deleteWallet(wallet.id!, { userId: user.id, email: user.email });
    if (res.reason === "last-wallet") {
      notify("Cannot delete", "You need at least one wallet.");
      return;
    }
    if (res.reason === "needs-password") {
      setPwWallet(wallet);
      setPwValue("");
      return;
    }
    if (res.ok) {
      await refresh();
      maybeFixActive(wallet);
    }
  };

  const confirmPasswordDelete = async () => {
    if (!pwWallet) return;
    setPwConfirming(true);
    const res = await WalletService.deleteWallet(pwWallet.id!, {
      userId: user.id,
      email: user.email,
      password: pwValue,
    });
    setPwConfirming(false);
    if (res.reason === "bad-password") {
      notify("Wrong password", "Please try again.");
      return;
    }
    if (res.ok) {
      const deleted = pwWallet;
      setPwWallet(null);
      await refresh();
      maybeFixActive(deleted);
    }
  };

  const WalletRow: React.FC<{ wallet: Wallet }> = ({ wallet }) => (
    <HStack
      alignItems="center"
      justifyContent="space-between"
      bg="muted.50"
      borderRadius={14}
      shadow={1}
      px={4}
      py={3}>
      <HStack alignItems="center" space={3} flex={1}>
        <Box
          width="42px"
          height="42px"
          borderRadius={14}
          justifyContent="center"
          alignItems="center"
          style={{ backgroundColor: wallet.color || accent[700] }}>
          {renderCategoryIcon(wallet.icon ?? "cash", wallet.name, 22, "#fff")}
        </Box>
        <VStack flex={1}>
          <Text fontFamily="SourceBold" fontSize={17} numberOfLines={1}>
            {wallet.name}
          </Text>
          <HStack space={1} mt={wallet.isDefault || wallet.excludeFromTotal ? 0.5 : 0}>
            {wallet.isDefault && (
              <Badge
                colorScheme="purple"
                variant="subtle"
                borderRadius={6}
                alignSelf="flex-start"
                px={2}
                py={0}
                _text={{ fontSize: 11, fontFamily: "SourceBold" }}>
                Default
              </Badge>
            )}
            {wallet.excludeFromTotal && (
              <Badge
                colorScheme="muted"
                variant="subtle"
                borderRadius={6}
                alignSelf="flex-start"
                px={2}
                py={0}
                _text={{ fontSize: 11, fontFamily: "SourceBold" }}>
                Not in total
              </Badge>
            )}
          </HStack>
        </VStack>
      </HStack>
      <HStack space={1} alignItems="center">
        {!wallet.isDefault && (
          <TouchableOpacity onPress={() => handleSetDefault(wallet)} style={{ padding: 6 }}>
            <MaterialCommunityIcons name="star-outline" size={20} color={accent[700]} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => openEdit(wallet)} style={{ padding: 6 }}>
          <Feather name="edit-2" size={18} color={COLORS.MUTED[500]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(wallet)} style={{ padding: 6 }}>
          <Feather name="trash-2" size={18} color={COLORS.DANGER[500]} />
        </TouchableOpacity>
      </HStack>
    </HStack>
  );

  const GroupHeader: React.FC<{ group: WalletGroup }> = ({ group }) => (
    <HStack alignItems="center" space={2} pl={1}>
      <Box
        width="26px"
        height="26px"
        borderRadius={9}
        justifyContent="center"
        alignItems="center"
        style={{ backgroundColor: group.color || accent[700] }}>
        {renderCategoryIcon(group.icon ?? "cash", group.name, 15, "#fff")}
      </Box>
      <Text fontFamily="SourceBold" fontSize={16} flex={1} numberOfLines={1}>
        {group.name}
      </Text>
      <TouchableOpacity onPress={() => openAdd(group.id ?? null)} style={{ padding: 6 }}>
        <Feather name="plus" size={18} color={accent[700]} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => openEditGroup(group)} style={{ padding: 6 }}>
        <Feather name="edit-2" size={16} color={COLORS.MUTED[500]} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDeleteGroup(group)} style={{ padding: 6 }}>
        <Feather name="trash-2" size={16} color={COLORS.DANGER[500]} />
      </TouchableOpacity>
    </HStack>
  );

  const ungroupedWallets = wallets.filter((w) => !w.groupId);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={user.theme === "dark" ? "light" : "dark"} />
      <View flex={1} pt={12} px={6}>
        <HStack alignItems="center" justifyContent="space-between" mb={4}>
          <Text fontFamily="SourceBold" fontSize={26}>
            Manage Wallets
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="close" size={24} color={user.theme === "dark" ? "#fff" : "#111827"} />
          </TouchableOpacity>
        </HStack>

        <HStack space={3} mb={4}>
          <Pressable flex={1} onPress={() => openAdd()} _pressed={{ opacity: 0.7 }}>
            <HStack
              bg="purple.700"
              borderRadius={12}
              height="48px"
              alignItems="center"
              justifyContent="center"
              space={2}>
              <Feather name="plus" size={20} color="#fff" />
              <Text fontFamily="SourceBold" fontSize={16} color="white">
                Add wallet
              </Text>
            </HStack>
          </Pressable>
          <Pressable flex={1} onPress={openAddGroup} _pressed={{ opacity: 0.7 }}>
            <HStack
              borderWidth={1.5}
              borderColor="purple.700"
              borderRadius={12}
              height="48px"
              alignItems="center"
              justifyContent="center"
              space={2}>
              <Feather name="folder-plus" size={18} color={accent[700]} />
              <Text fontFamily="SourceBold" fontSize={16} color="purple.700">
                Add group
              </Text>
            </HStack>
          </Pressable>
        </HStack>

        {loading ? (
          <View flex={1} justifyContent="center" alignItems="center">
            <Spinner color="purple.700" size="lg" />
          </View>
        ) : wallets.length === 0 ? (
          <View flex={1} justifyContent="center" alignItems="center" px={6}>
            <MaterialCommunityIcons name="wallet-outline" size={56} color={COLORS.MUTED[300]} />
            <Text fontSize={18} fontFamily="SourceSansPro" color="muted.400" mt={2}>
              No wallets yet
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <VStack space={5}>
              {groups.map((g: WalletGroup) => {
                const members = wallets.filter((w) => w.groupId === g.id);
                return (
                  <VStack key={`g-${g.id}`} space={3}>
                    <GroupHeader group={g} />
                    {members.length === 0 ? (
                      <Text fontFamily="SourceSansPro" fontSize={13} color="muted.400" pl={1}>
                        No wallets in this group yet
                      </Text>
                    ) : (
                      members.map((wallet: Wallet) => (
                        <WalletRow key={wallet.id} wallet={wallet} />
                      ))
                    )}
                  </VStack>
                );
              })}

              {ungroupedWallets.length > 0 && (
                <VStack space={3}>
                  {groups.length > 0 && (
                    <Text
                      fontFamily="SourceBold"
                      fontSize={13}
                      color="muted.400"
                      textTransform="uppercase"
                      letterSpacing={1}
                      pl={1}>
                      Ungrouped
                    </Text>
                  )}
                  {ungroupedWallets.map((wallet: Wallet) => (
                    <WalletRow key={wallet.id} wallet={wallet} />
                  ))}
                </VStack>
              )}
            </VStack>
          </ScrollView>
        )}
      </View>

      {/* Add / edit modal */}
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
                  {mode === "edit" ? "Edit wallet" : "New wallet"}
                </Text>
              </HStack>

              <EZInput
                style={authInput}
                type="text"
                label="Name"
                placeholder="e.g. Savings"
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

              <HStack alignItems="center" justifyContent="space-between" space={3}>
                <VStack flex={1}>
                  <Text fontFamily="SourceBold" fontSize={16}>
                    Don't include in total
                  </Text>
                  <Text fontFamily="SourceSansPro" fontSize={13} color="muted.400">
                    Skip this wallet from the combined balance
                  </Text>
                </VStack>
                <Switch
                  isChecked={excludeFromTotal}
                  onToggle={() => setExcludeFromTotal((v) => !v)}
                  onTrackColor={accent[700]}
                />
              </HStack>

              {groups.length > 0 && (
                <VStack space={2}>
                  <Text fontFamily="SourceBold" fontSize={16}>
                    Group
                  </Text>
                  <Box flexDirection="row" flexWrap="wrap" style={{ marginHorizontal: -4 }}>
                    {[{ id: null, name: "None" } as { id: number | null; name: string }, ...groups].map(
                      (g) => {
                        const active = groupId === (g.id ?? null);
                        return (
                          <Pressable
                            key={String(g.id ?? "none")}
                            onPress={() => setGroupId(g.id ?? null)}
                            style={{ margin: 4 }}>
                            <Box
                              px={3}
                              py={2}
                              borderRadius={12}
                              borderWidth={1.5}
                              borderColor={active ? accent[700] : "muted.200"}
                              bg={active ? "purple.100" : "transparent"}>
                              <Text
                                fontFamily="SourceBold"
                                fontSize={14}
                                color={active ? "purple.700" : "muted.500"}>
                                {g.name}
                              </Text>
                            </Box>
                          </Pressable>
                        );
                      }
                    )}
                  </Box>
                </VStack>
              )}

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

      {/* Group add / edit modal */}
      <Modal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} avoidKeyboard>
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
                  style={{ backgroundColor: groupColor || "#7e22ce" }}>
                  {renderCategoryIcon(groupIcon, groupName, 24, "#fff")}
                </Box>
                <Text fontFamily="SourceBold" fontSize={20}>
                  {groupMode === "edit" ? "Edit group" : "New group"}
                </Text>
              </HStack>

              <EZInput
                style={authInput}
                type="text"
                label="Name"
                placeholder="e.g. Banks"
                value={groupName}
                onChangeText={setGroupName}
                borderRadius={12}
                borderColor="muted.200"
              />

              <VStack space={2}>
                <Text fontFamily="SourceBold" fontSize={16}>
                  Color
                </Text>
                <Box flexDirection="row" flexWrap="wrap">
                  {COLOR_PALETTE.map((c) => (
                    <Pressable key={c} onPress={() => setGroupColor(c)} m={1}>
                      <Box
                        width="34px"
                        height="34px"
                        borderRadius={17}
                        style={{ backgroundColor: c }}
                        borderWidth={groupColor === c ? 3 : 0}
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
                    const active = opt.key === groupIcon;
                    return (
                      <Pressable key={opt.key} onPress={() => setGroupIcon(opt.key)} m={1}>
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

              <EZButton
                variant="solid"
                isLoading={groupSaving}
                onPress={saveGroup}
                bg="purple.700"
                borderRadius={8}
                height="46px"
                _text={{ fontFamily: "SourceSansPro", fontSize: 16 }}>
                {groupMode === "edit" ? "Save changes" : "Create group"}
              </EZButton>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Password-confirmation delete modal */}
      <Modal isOpen={!!pwWallet} onClose={() => setPwWallet(null)} avoidKeyboard>
        <Modal.Content
          maxWidth="380px"
          width="90%"
          bg={user.theme === "dark" ? "#1f2937" : "white"}>
          <Modal.CloseButton _icon={{ color: user.theme === "dark" ? "#ffffff" : "#262626" }} />
          <Modal.Body>
            <VStack space={4}>
              <Text fontFamily="SourceBold" fontSize={18}>
                Confirm deletion
              </Text>
              <Text fontFamily="SourceSansPro" fontSize={14} color="muted.600">
                This wallet has data. Enter your account password to confirm deletion of
                {" "}<Text fontFamily="SourceBold">{pwWallet?.name}</Text>.
              </Text>
              <EZInput
                style={authInput}
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={pwValue}
                onChangeText={setPwValue}
                borderRadius={12}
                borderColor="muted.200"
              />
              <HStack space={3}>
                <EZButton
                  flex={1}
                  variant="outline"
                  onPress={() => setPwWallet(null)}
                  borderRadius={8}
                  height="44px"
                  borderColor="muted.300"
                  _text={{ fontFamily: "SourceSansPro", fontSize: 15, color: COLORS.MUTED[700] }}>
                  Cancel
                </EZButton>
                <EZButton
                  flex={1}
                  variant="solid"
                  isLoading={pwConfirming}
                  onPress={confirmPasswordDelete}
                  bg="red.600"
                  borderRadius={8}
                  height="44px"
                  _text={{ fontFamily: "SourceSansPro", fontSize: 15 }}>
                  Delete
                </EZButton>
              </HStack>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </SafeAreaView>
  );
};

export default WalletManagerScreen;
