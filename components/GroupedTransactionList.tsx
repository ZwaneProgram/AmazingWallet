import React, { useMemo, useState } from "react";
import { HStack, VStack, Box, Pressable, Text } from "native-base";
import { Feather, AntDesign } from "@expo/vector-icons";
import moment from "moment";
import COLORS from "../colors";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { Category } from "../interfaces/Category";

interface Txn {
  id: number;
  kind: "expense" | "income" | "transfer";
  amount: number;
  description?: string;
  payDate: string;
  name?: string;
  color?: string;
  categoryId?: number;
  walletName?: string;
  walletColor?: string;
  // transfer-only
  fromWalletId?: number;
  toWalletId?: number;
  fromWalletName?: string;
  toWalletName?: string;
}

interface GroupItem {
  type: "group";
  parent: Category;
  children: Txn[];
  total: number;
}

interface SingleItem {
  type: "txn";
  txn: Txn;
}

type RenderItem = GroupItem | SingleItem;

interface DateSection {
  key: string;
  label: string;
  items: RenderItem[];
}

// "Today" / "Yesterday" / "12 Jun 2026" for the section header.
const dateLabel = (payDate: string) => {
  const d = moment(payDate);
  const diff = moment().startOf("day").diff(d.clone().startOf("day"), "days");
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.format("DD MMM YYYY");
};

// A small pill showing which wallet a transaction belongs to (sits on the
// coloured rows, so it uses a translucent white background).
const WalletChip: React.FC<{ name?: string; small?: boolean }> = ({ name, small }) =>
  name ? (
    <HStack
      alignItems="center"
      space={1}
      px={1.5}
      borderRadius={8}
      style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
      <Feather name="credit-card" size={small ? 9 : 10} color="#fff" />
      <Text fontFamily="SourceBold" fontSize={small ? 10 : 11} color="white" numberOfLines={1}>
        {name}
      </Text>
    </HStack>
  ) : null;

interface Props {
  transactions: Txn[];
  categories: Category[];
  symbol?: string;
  // When viewing a single wallet, transfers read as outgoing (−) from it or
  // incoming (+) to it. Undefined = "all wallets", so transfers show neutrally.
  walletPerspective?: number;
  onPressTransaction: (txn: Txn) => void;
}

const GroupedTransactionList: React.FC<Props> = ({
  transactions,
  categories,
  symbol,
  walletPerspective,
  onPressTransaction,
}) => {
  // Keyed by `${sectionKey}:${parentId}` so the same category on different days
  // expands independently.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const sections = useMemo<DateSection[]>(() => {
    const catById = new Map<number, Category>();
    categories.forEach((c) => c.id != null && catById.set(c.id, c));

    // First bucket transactions by day, preserving the incoming (date-desc) order.
    const sectionOrder: string[] = [];
    const byDay = new Map<string, Txn[]>();
    for (const txn of transactions) {
      const key = moment(txn.payDate).format("YYYY-MM-DD");
      let bucket = byDay.get(key);
      if (!bucket) {
        bucket = [];
        byDay.set(key, bucket);
        sectionOrder.push(key);
      }
      bucket.push(txn);
    }

    // Then apply category grouping within each day.
    return sectionOrder.map((key) => {
      const dayTxns = byDay.get(key)!;
      const result: RenderItem[] = [];
      const groupByParent = new Map<number, GroupItem>();

      for (const txn of dayTxns) {
        if (txn.kind === "expense") {
          const cat = txn.categoryId != null ? catById.get(txn.categoryId) : undefined;
          const parentId = cat?.parentId;
          if (parentId != null) {
            const parentCat = catById.get(parentId);
            if (parentCat) {
              let group = groupByParent.get(parentId);
              if (!group) {
                group = { type: "group", parent: parentCat, children: [], total: 0 };
                groupByParent.set(parentId, group);
                result.push(group);
              }
              group.children.push(txn);
              group.total += txn.amount;
              continue;
            }
          }
        }
        result.push({ type: "txn", txn });
      }

      return { key, label: dateLabel(dayTxns[0].payDate), items: result };
    });
  }, [transactions, categories]);

  const renderRow = (txn: Txn, keyPrefix: string) => {
    const isIncome = txn.kind === "income";
    const isTransfer = txn.kind === "transfer";

    // Transfer sign/route depend on which wallet we're looking from.
    let sign = isIncome ? "+" : "-";
    let route = "";
    if (isTransfer) {
      if (walletPerspective === txn.fromWalletId) {
        sign = "-";
        route = `To ${txn.toWalletName ?? "wallet"}`;
      } else if (walletPerspective === txn.toWalletId) {
        sign = "+";
        route = `From ${txn.fromWalletName ?? "wallet"}`;
      } else {
        sign = "";
        route = `${txn.fromWalletName ?? "wallet"} → ${txn.toWalletName ?? "wallet"}`;
      }
    }

    const bg = isTransfer ? "#475569" : isIncome ? COLORS.EMERALD[500] : COLORS.DANGER[500];

    return (
      <Pressable
        key={keyPrefix}
        onPress={() => onPressTransaction(txn)}
        _pressed={{ opacity: 0.5 }}>
        <HStack
          alignItems="center"
          justifyContent="space-between"
          borderRadius={18}
          shadow={1}
          px={4}
          py={3.5}
          style={{ backgroundColor: bg }}>
          <HStack alignItems="center" space={3} flex={1}>
            <Box
              width="44px"
              height="44px"
              borderRadius={16}
              justifyContent="center"
              alignItems="center"
              style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
              {isTransfer ? (
                <Feather name="repeat" size={20} color="#fff" />
              ) : (
                renderCategoryIcon(catIcon(categories, txn.categoryId), txn.name, 22, "#fff") ?? (
                  <Feather
                    name={isIncome ? "arrow-down-left" : "arrow-up-right"}
                    size={22}
                    color="#fff"
                  />
                )
              )}
            </Box>
            <VStack flex={1}>
              <Text fontFamily="SourceBold" fontSize={16} color="white" numberOfLines={1}>
                {isTransfer ? "Transfer" : txn.name ?? (isIncome ? "Income" : "Expense")}
              </Text>
              <HStack alignItems="center" space={1.5} mt={0.5}>
                {isTransfer ? (
                  <Text
                    fontFamily="SourceSansPro"
                    fontSize={13}
                    color="white"
                    opacity={0.85}
                    flexShrink={1}
                    numberOfLines={1}>
                    {route}
                    {txn.description ? ` · ${txn.description}` : ""}
                  </Text>
                ) : (
                  <>
                    <WalletChip name={txn.walletName} />
                    {txn.description ? (
                      <Text
                        fontFamily="SourceSansPro"
                        fontSize={13}
                        color="white"
                        opacity={0.85}
                        flexShrink={1}
                        numberOfLines={1}>
                        {txn.description}
                      </Text>
                    ) : null}
                  </>
                )}
              </HStack>
            </VStack>
          </HStack>
          <Text fontFamily="SourceBold" fontSize={16} color="white">
            {sign}
            {symbol} {txn.amount.toFixed(2)}
          </Text>
        </HStack>
      </Pressable>
    );
  };

  const renderGroup = (group: GroupItem, keyPrefix: string, expandKey: string) => {
    const { parent, children, total } = group;
    const isOpen = !!expanded[expandKey];
    return (
      <VStack key={keyPrefix} space={2}>
        <Pressable onPress={() => toggle(expandKey)} _pressed={{ opacity: 0.5 }}>
          <HStack
            alignItems="center"
            justifyContent="space-between"
            borderRadius={18}
            shadow={1}
            px={4}
            py={3.5}
            style={{ backgroundColor: COLORS.DANGER[500] }}>
            <HStack alignItems="center" space={3} flex={1}>
              <Box
                width="44px"
                height="44px"
                borderRadius={16}
                justifyContent="center"
                alignItems="center"
                style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
                {renderCategoryIcon(parent.icon, parent.name, 22, "#fff") ?? (
                  <Feather name="arrow-up-right" size={22} color="#fff" />
                )}
              </Box>
              <VStack flex={1}>
                <HStack alignItems="center" space={1}>
                  <Text fontFamily="SourceBold" fontSize={16} color="white" numberOfLines={1}>
                    {parent.name}
                  </Text>
                  <AntDesign name={isOpen ? "up" : "down"} size={12} color="#fff" />
                </HStack>
                <Text
                  fontFamily="SourceSansPro"
                  fontSize={13}
                  color="white"
                  opacity={0.85}
                  numberOfLines={1}>
                  {children.length} {children.length === 1 ? "item" : "items"}
                </Text>
              </VStack>
            </HStack>
            <Text fontFamily="SourceBold" fontSize={16} color="white">
              -{symbol} {total.toFixed(2)}
            </Text>
          </HStack>
        </Pressable>

        {isOpen && (
          <VStack space={2} pl={6}>
            {children.map((child, childIndex) => (
              <Pressable
                key={`${keyPrefix}-child-${childIndex}`}
                onPress={() => onPressTransaction(child)}
                _pressed={{ opacity: 0.5 }}>
                <HStack
                  alignItems="center"
                  justifyContent="space-between"
                  borderRadius={12}
                  px={3}
                  py={2}
                  style={{ backgroundColor: COLORS.DANGER[600] }}>
                  <HStack alignItems="center" space={3} flex={1}>
                    <Box
                      width="34px"
                      height="34px"
                      borderRadius={12}
                      justifyContent="center"
                      alignItems="center"
                      style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
                      {renderCategoryIcon(catIcon(categories, child.categoryId), child.name, 16, "#fff") ?? (
                        <Feather name="arrow-up-right" size={16} color="#fff" />
                      )}
                    </Box>
                    <VStack flex={1}>
                      <Text fontFamily="SourceBold" fontSize={14} color="white" numberOfLines={1}>
                        {child.name ?? "Expense"}
                      </Text>
                      <HStack alignItems="center" space={1.5} mt={0.5}>
                        <WalletChip name={child.walletName} small />
                        {child.description ? (
                          <Text
                            fontFamily="SourceSansPro"
                            fontSize={12}
                            color="white"
                            opacity={0.85}
                            flexShrink={1}
                            numberOfLines={1}>
                            {child.description}
                          </Text>
                        ) : null}
                      </HStack>
                    </VStack>
                  </HStack>
                  <Text fontFamily="SourceBold" fontSize={14} color="white">
                    -{symbol} {child.amount.toFixed(2)}
                  </Text>
                </HStack>
              </Pressable>
            ))}
          </VStack>
        )}
      </VStack>
    );
  };

  return (
    <VStack space={5}>
      {sections.map((section) => (
        <VStack key={section.key} space={3}>
          <Text
            fontFamily="SourceBold"
            fontSize={13}
            letterSpacing={0.5}
            style={{ color: COLORS.MUTED[400] }}>
            {section.label.toUpperCase()}
          </Text>
          {section.items.map((item, index) =>
            item.type === "group"
              ? renderGroup(
                  item,
                  `group-${section.key}-${index}-${item.parent.id ?? "x"}`,
                  `${section.key}:${item.parent.id ?? "x"}`
                )
              : renderRow(
                  item.txn,
                  `row-${section.key}-${index}-${item.txn.kind}-${item.txn.id ?? "x"}`
                )
          )}
        </VStack>
      ))}
    </VStack>
  );
};

const catIcon = (categories: Category[], categoryId?: number) =>
  categoryId != null ? categories.find((c) => c.id === categoryId)?.icon : undefined;

export default GroupedTransactionList;
