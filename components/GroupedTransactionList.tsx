import React, { useMemo, useState } from "react";
import { HStack, VStack, Box, Pressable, Text } from "native-base";
import { Feather, AntDesign } from "@expo/vector-icons";
import moment from "moment";
import COLORS from "../colors";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { Category } from "../interfaces/Category";

interface Txn {
  id: number;
  kind: "expense" | "income";
  amount: number;
  description?: string;
  payDate: string;
  name?: string;
  color?: string;
  categoryId?: number;
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

interface Props {
  transactions: Txn[];
  categories: Category[];
  symbol?: string;
  onPressTransaction: (txn: Txn) => void;
}

const GroupedTransactionList: React.FC<Props> = ({
  transactions,
  categories,
  symbol,
  onPressTransaction,
}) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const items = useMemo<RenderItem[]>(() => {
    const catById = new Map<number, Category>();
    categories.forEach((c) => c.id != null && catById.set(c.id, c));

    const result: RenderItem[] = [];
    const groupByParent = new Map<number, GroupItem>();

    for (const txn of transactions) {
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

    return result;
  }, [transactions, categories]);

  const renderRow = (txn: Txn) => {
    const isIncome = txn.kind === "income";
    return (
      <Pressable
        key={`${txn.kind}-${txn.id}`}
        onPress={() => onPressTransaction(txn)}
        _pressed={{ opacity: 0.5 }}>
        <HStack
          alignItems="center"
          justifyContent="space-between"
          borderRadius={14}
          shadow={1}
          px={4}
          py={3}
          style={{ backgroundColor: isIncome ? COLORS.EMERALD[500] : COLORS.DANGER[500] }}>
          <HStack alignItems="center" space={3} flex={1}>
            <Box
              width="44px"
              height="44px"
              borderRadius={16}
              justifyContent="center"
              alignItems="center"
              style={{
                backgroundColor: isIncome ? COLORS.EMERALD[500] : txn.color || COLORS.PURPLE[700],
              }}>
              {isIncome ? (
                <Feather name="arrow-down-left" size={22} color="#fff" />
              ) : (
                renderCategoryIcon(
                  catIcon(categories, txn.categoryId),
                  txn.name,
                  22,
                  "#fff"
                ) ?? <Feather name="arrow-up-right" size={22} color="#fff" />
              )}
            </Box>
            <VStack flex={1}>
              <Text fontFamily="SourceBold" fontSize={16} color="white" numberOfLines={1}>
                {isIncome ? "Income" : txn.name ?? "Expense"}
              </Text>
              <Text
                fontFamily="SourceSansPro"
                fontSize={13}
                color="white"
                opacity={0.85}
                numberOfLines={1}>
                {txn.description ? `${txn.description} · ` : ""}
                {moment(txn.payDate).format("DD MMM YYYY")}
              </Text>
            </VStack>
          </HStack>
          <Text fontFamily="SourceBold" fontSize={16} color="white">
            {isIncome ? "+" : "-"}
            {symbol} {txn.amount.toFixed(2)}
          </Text>
        </HStack>
      </Pressable>
    );
  };

  const renderGroup = (group: GroupItem) => {
    const { parent, children, total } = group;
    const isOpen = !!expanded[parent.id!];
    return (
      <VStack key={`group-${parent.id}`} space={2}>
        <Pressable onPress={() => toggle(parent.id!)} _pressed={{ opacity: 0.5 }}>
          <HStack
            alignItems="center"
            justifyContent="space-between"
            borderRadius={14}
            shadow={1}
            px={4}
            py={3}
            style={{ backgroundColor: COLORS.DANGER[500] }}>
            <HStack alignItems="center" space={3} flex={1}>
              <Box
                width="44px"
                height="44px"
                borderRadius={16}
                justifyContent="center"
                alignItems="center"
                style={{ backgroundColor: parent.color || COLORS.PURPLE[700] }}>
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
            {children.map((child) => (
              <Pressable
                key={`${child.kind}-${child.id}`}
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
                      style={{ backgroundColor: child.color || COLORS.PURPLE[700] }}>
                      {renderCategoryIcon(catIcon(categories, child.categoryId), child.name, 16, "#fff") ?? (
                        <Feather name="arrow-up-right" size={16} color="#fff" />
                      )}
                    </Box>
                    <VStack flex={1}>
                      <Text fontFamily="SourceBold" fontSize={14} color="white" numberOfLines={1}>
                        {child.name ?? "Expense"}
                      </Text>
                      <Text
                        fontFamily="SourceSansPro"
                        fontSize={12}
                        color="white"
                        opacity={0.85}
                        numberOfLines={1}>
                        {child.description ? `${child.description} · ` : ""}
                        {moment(child.payDate).format("DD MMM YYYY")}
                      </Text>
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
    <VStack space={3}>
      {items.map((item) =>
        item.type === "group" ? renderGroup(item) : renderRow(item.txn)
      )}
    </VStack>
  );
};

const catIcon = (categories: Category[], categoryId?: number) =>
  categoryId != null ? categories.find((c) => c.id === categoryId)?.icon : undefined;

export default GroupedTransactionList;
