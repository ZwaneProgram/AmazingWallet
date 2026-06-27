import React, { useEffect, useState } from "react";
import { Modal, VStack, HStack, Text, Pressable, Box, ScrollView } from "native-base";
import { Feather } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Wallet } from "../interfaces/Wallet";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { RootState } from "../redux/store";
import EZInput from "./shared/EZInput";
import EZButton from "./shared/EZButton";
import COLORS from "../colors";
import { authInput } from "../commonStyles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  defaultFromId?: number;
  symbol?: string;
  onSubmit: (input: {
    fromWalletId: number;
    toWalletId: number;
    amount: number;
    description?: string;
  }) => Promise<void> | void;
}

const TransferModal: React.FC<Props> = ({
  isOpen,
  onClose,
  wallets,
  defaultFromId,
  symbol,
  onSubmit,
}) => {
  const isDark = useSelector((state: RootState) => state.user.theme) === "dark";
  const [fromId, setFromId] = useState<number | undefined>(undefined);
  const [toId, setToId] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const from = defaultFromId ?? wallets[0]?.id;
      const to = wallets.find((w) => w.id !== from)?.id;
      setFromId(from);
      setToId(to);
      setAmount("");
      setNote("");
      setError("");
      setSaving(false);
    }
  }, [isOpen]);

  const accent = isDark ? COLORS.PURPLE[300] : COLORS.PURPLE[700];
  const chipActiveBg = isDark ? "rgba(168,85,247,0.18)" : COLORS.PURPLE[100];

  // A horizontal row of selectable wallet chips. The chip matching `disabledId`
  // (the wallet picked on the other side) is dimmed so From and To can't match.
  const WalletChips: React.FC<{
    selectedId?: number;
    disabledId?: number;
    onSelect: (id: number) => void;
  }> = ({ selectedId, disabledId, onSelect }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <HStack space={2}>
        {wallets.map((w) => {
          const active = w.id === selectedId;
          const disabled = w.id === disabledId;
          return (
            <Pressable
              key={w.id}
              isDisabled={disabled}
              opacity={disabled ? 0.35 : 1}
              onPress={() => onSelect(w.id!)}>
              <HStack
                alignItems="center"
                space={2}
                px={3}
                py={2}
                borderRadius={12}
                borderWidth={1.5}
                borderColor={active ? COLORS.PURPLE[400] : "muted.200"}
                bg={active ? chipActiveBg : "muted.50"}>
                {renderCategoryIcon(w.icon ?? "cash", w.name, 18, w.color || COLORS.PURPLE[700])}
                <Text fontFamily="SourceBold" fontSize={14} color={active ? accent : undefined}>
                  {w.name}
                </Text>
              </HStack>
            </Pressable>
          );
        })}
      </HStack>
    </ScrollView>
  );

  const submit = async () => {
    const numeric = Number(amount.replace(",", "."));
    if (fromId == null || toId == null) {
      setError("Pick both wallets.");
      return;
    }
    if (fromId === toId) {
      setError("Choose two different wallets.");
      return;
    }
    if (!numeric || numeric <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ fromWalletId: fromId, toWalletId: toId, amount: numeric, description: note });
      onClose();
    } catch (e) {
      console.log("transfer submit failed:", e);
      setError("Could not save the transfer. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} avoidKeyboard>
      <Modal.Content maxWidth="420px" width="92%" bg={isDark ? "#1f2937" : "white"}>
        <Modal.CloseButton _icon={{ color: isDark ? "#ffffff" : "#262626" }} />
        <Modal.Body>
          <VStack space={4}>
            <Text fontFamily="SourceBold" fontSize={20}>
              Transfer money
            </Text>

            <VStack space={2}>
              <Text fontFamily="SourceBold" fontSize={15}>
                From
              </Text>
              <WalletChips selectedId={fromId} disabledId={toId} onSelect={setFromId} />
            </VStack>

            <HStack justifyContent="center">
              <Box bg={isDark ? "#374151" : "muted.100"} borderRadius={20} p={1.5}>
                <Feather name="arrow-down" size={20} color={accent} />
              </Box>
            </HStack>

            <VStack space={2}>
              <Text fontFamily="SourceBold" fontSize={15}>
                To
              </Text>
              <WalletChips selectedId={toId} disabledId={fromId} onSelect={setToId} />
            </VStack>

            <EZInput
              style={authInput}
              type="text"
              keyboardType="decimal-pad"
              label={`Amount ${symbol ?? ""}`}
              placeholder="0"
              value={amount}
              onChangeText={setAmount}
              borderRadius={12}
              borderColor="muted.200"
            />

            <EZInput
              style={authInput}
              type="text"
              label="Note (optional)"
              placeholder="Add a note"
              value={note}
              onChangeText={setNote}
              borderRadius={12}
              borderColor="muted.200"
            />

            {error ? (
              <Text color="danger.500" fontFamily="SourceBold" fontSize={14}>
                {error}
              </Text>
            ) : null}

            <EZButton
              variant="solid"
              isLoading={saving}
              onPress={submit}
              bg={COLORS.PURPLE[700]}
              borderRadius={8}
              height="44px"
              _text={{ fontFamily: "SourceSansPro", fontSize: 16 }}
              _pressed={{ backgroundColor: COLORS.PURPLE[700], opacity: 0.7 }}>
              Transfer
            </EZButton>
          </VStack>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default TransferModal;
