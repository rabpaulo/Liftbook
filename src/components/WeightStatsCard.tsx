import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useBodyweight } from "@/hooks/use-bodyweight";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "./themed-text";

const rangeOptions = [7, 14, 30, 90] as const;

type RangeOption = (typeof rangeOptions)[number];

type ParsedWeightLog = {
  id: number;
  date: string;
  weight: number;
  parsedDate: Date;
};

function parseBodyweightDate(dateString: string) {
  const parts = dateString.split("/").map((part) => Number(part));
  const [day = 0, month = 0, year = 0] = parts;
  return new Date(2000 + year, month - 1, day);
}

function formatDayLabel(date: Date) {
  return String(date.getDate()).padStart(2, "0");
}

function getDateKey(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

export default function WeightStatsCard() {
  const theme = useTheme();
  const { weeklyData } = useBodyweight();
  const [rangeDays, setRangeDays] = useState<RangeOption>(7);
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  const logs = useMemo(() => {
    return weeklyData
      .flatMap((week) =>
        week.entries.map((entry: any) => ({
          ...entry,
          parsedDate: parseBodyweightDate(entry.date),
        })),
      )
      .filter((entry: ParsedWeightLog) => !Number.isNaN(entry.parsedDate.getTime()))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [weeklyData]);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const chartData = useMemo(() => {
    const endDate = today;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (rangeDays - 1));

    const byDate = new Map<string, ParsedWeightLog>();
    logs.forEach((entry) => {
      const key = getDateKey(entry.parsedDate);
      const existing = byDate.get(key);
      if (!existing || existing.parsedDate.getTime() < entry.parsedDate.getTime()) {
        byDate.set(key, entry);
      }
    });

    const days: Array<{ date: Date; label: string; weight: number | null }> = [];
    for (let offset = 0; offset < rangeDays; offset += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + offset);
      const key = getDateKey(date);
      days.push({ date, label: formatDayLabel(date), weight: byDate.get(key)?.weight ?? null });
    }

    const weights = days.filter((item) => item.weight !== null).map((item) => item.weight as number);
    const minWeight = Math.min(...(weights.length ? weights : [60]));
    const maxWeight = Math.max(...(weights.length ? weights : [90]));
    const padding = Math.max(1, (maxWeight - minWeight) * 0.15);
    const rangeMin = Math.floor(minWeight - padding);
    const rangeMax = Math.ceil(maxWeight + padding);

    return { days, rangeMin, rangeMax, hasWeight: weights.length > 0 };
  }, [today, logs, rangeDays]);

  const { days, rangeMin, rangeMax, hasWeight } = chartData;
  const chartHeight = 180;
  const screenWidth = Dimensions.get("window").width;
  const pointSpacing = rangeDays <= 7 ? 48 : rangeDays <= 14 ? 30 : rangeDays <= 30 ? 24 : 16;
  const contentWidth = Math.max(pointSpacing * (rangeDays - 1) + 48, screenWidth - 56);
  const linePoints = days.map((item, index) => {
    if (item.weight === null) return null;
    const normalized = rangeMax === rangeMin ? 0.5 : (item.weight - rangeMin) / (rangeMax - rangeMin);
    return {
      x: index * pointSpacing + 24,
      y: chartHeight - normalized * chartHeight,
    };
  });

  const axisLabels = Array.from({ length: 5 }).map((_, index) => {
    const value = rangeMin + ((rangeMax - rangeMin) / 4) * index;
    return Math.round(value * 10) / 10;
  }).reverse();

  const labelStep = rangeDays <= 14 ? 1 : rangeDays <= 30 ? 2 : 4;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}> 
      <View style={styles.header}>
        <View>
          <ThemedText type="default" style={styles.title} themeColor="text">
            Weight stats
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Plot your last {rangeDays} days of weight.
          </ThemedText>
        </View>

        <View style={styles.dropdownWrapper}>
          <Pressable
            style={({ pressed }) => [styles.dropdownButton, pressed && styles.dropdownButtonPressed, { borderColor: theme.backgroundSelected }]}
            onPress={() => setShowRangeMenu((current) => !current)}
          >
            <ThemedText type="smallBold" themeColor="text">
              {rangeDays} days
            </ThemedText>
          </Pressable>

          {showRangeMenu ? (
            <View style={[styles.menu, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}> 
              {rangeOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setRangeDays(option);
                    setShowRangeMenu(false);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <ThemedText type="small" themeColor="text">
                    Last {option} days
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.chartContainer}>
        {!hasWeight ? (
          <ThemedText type="small" themeColor="textSecondary">
            No weight data available for the selected range.
          </ThemedText>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ width: contentWidth + 16 }}>
            <View style={styles.axisGrid}>
              {axisLabels.map((label, index) => (
                <View key={`${label}-${index}`} style={styles.axisRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.axisLabel}>
                    {label}
                  </ThemedText>
                </View>
              ))}

              <View style={[styles.chartArea, { width: contentWidth }]}> 
                {axisLabels.map((_, index) => (
                  <View key={index} style={[styles.gridLine, { top: (chartHeight / 4) * index }]} />
                ))}

                {linePoints.map((point, index) => {
                  if (!point) return null;
                  const nextPoint = linePoints[index + 1];
                  if (nextPoint) {
                    const dx = nextPoint.x - point.x;
                    const dy = nextPoint.y - point.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const angle = `${Math.atan2(dy, dx)}rad`;
                    return (
                      <View
                        key={`segment-${index}`}
                        style={[
                          styles.lineSegment,
                          {
                            left: point.x,
                            top: point.y,
                            width: distance,
                            backgroundColor: theme.text,
                            transform: [{ rotate: angle }],
                          },
                        ]}
                      />
                    );
                  }
                  return null;
                })}

                {linePoints.map((point, index) => {
                  if (!point) return null;
                  return (
                    <View
                      key={`dot-${index}`}
                      style={[styles.dot, { left: point.x - 5, top: point.y - 5, backgroundColor: theme.text }]}
                    />
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.xAxis, { width: contentWidth + 16 }]}> 
        {days.map((item, index) => (
          <View key={getDateKey(item.date)} style={[styles.xLabelCell, { width: pointSpacing }]}> 
            {index % labelStep === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {item.label}
              </ThemedText>
            ) : (
              <View style={styles.xLabelSpacer} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  dropdownWrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownButtonPressed: {
    opacity: 0.8,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 52,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 20,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  chartContainer: {
    marginTop: 20,
    minHeight: 220,
    justifyContent: "center",
  },
  axisGrid: {
    paddingLeft: 36,
    paddingBottom: 16,
  },
  axisRow: {
    height: 45,
    justifyContent: "center",
  },
  axisLabel: {
    position: "absolute",
    left: -34,
    width: 32,
    textAlign: "right",
  },
  chartArea: {
    height: 180,
    marginTop: -10,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.16,
  },
  lineSegment: {
    position: "absolute",
    height: 2,
    borderRadius: 1,
  },
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 6,
  },
  xAxis: {
    marginTop: 14,
    paddingLeft: 36,
    paddingBottom: 4,
  },
  xLabelCell: {
    alignItems: "center",
  },
  xLabelSpacer: {
    height: 16,
  },
});
