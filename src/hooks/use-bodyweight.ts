import { BodyweightRepository, MockBodyweightRepository } from "@/database/repositories/bodyweightRepository";
import { useEffect, useMemo, useState } from "react";

export function useBodyweight() {
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    try {
      let repo = process.env.EXPO_PUBLIC_DB === 'dev' ? MockBodyweightRepository : BodyweightRepository;
      const data = await repo.findAll();
      setLogs(data);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  { /*
    add useCallback to fetchLogs to avoid unnecessary re-renders and potential infinite loops
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  */}
  const getLowestWeight = () => {
    if (logs.length === 0) return null;
    return logs.reduce((min, log) => (log.weight < min ? log.weight : min), logs[0].weight);
  };
  
  const getHighestWeight = () => {
    if (logs.length === 0) return null;
    return logs.reduce((max, log) => (log.weight > max ? log.weight : max), logs[0].weight);
  };

  const removeLog = async (id: number) => {
    try {
      await BodyweightRepository.remove(id);
      await fetchLogs();
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  const updateLog = async (id: number, weightStr: string) => {
    if (!weightStr) return false;
    try {
      await BodyweightRepository.update(id, parseFloat(weightStr));
      await fetchLogs();
      return true;
    } catch (error) {
      console.error("Error updating log:", error);
      return false;
    }
  };

  const addLog = async (date: string, weightStr: string) => {
    if (!weightStr) return false;
    try {
      await BodyweightRepository.create(date, parseFloat(weightStr));
      await fetchLogs();
      return true;
    } catch (error) {
      console.error("Error saving weight:", error);
      return false;
    }
  };

  const checkEntryToday = async () => {
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    return await BodyweightRepository.existsByDate(today);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const weeklyData = useMemo(() => {
    const groups: Record<string, any[]> = {};

    logs.forEach((log) => {
      const [day, month, year] = log.date.split("/");
      const date = new Date(
        2000 + Number(year),
        Number(month) - 1,
        Number(day),
      );
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

      const monday = new Date(date);
      monday.setDate(date.getDate() - dayOfWeek + 1);
      const weekKey = monday.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });

      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(log);
    });

    return Object.entries(groups).map(([weekStart, entries]) => {
      const count = entries.length;
      const avg = entries.reduce((sum, e) => sum + e.weight, 0) / count;

      // Calcula a chave da semana anterior (segunda-feira - 7 dias)
      const [d, m, y] = weekStart.split("/");
      const prevMonday = new Date(
        2000 + Number(y),
        Number(m) - 1,
        Number(d) - 7,
      );
      const prevWeekKey = prevMonday.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });

      // Calcula o diff se a semana anterior existir
      let diff: string | null = null;
      if (groups[prevWeekKey]) {
        const prevEntries = groups[prevWeekKey];
        const prevAvg =
          prevEntries.reduce((sum, e) => sum + e.weight, 0) /
          prevEntries.length;
        diff = (avg - prevAvg).toFixed(2);
      }

      return {
        id: weekStart,
        count,
        avg: avg.toFixed(2),
        diff,
        entries,
      };
    });
  }, [logs]);

  return { weeklyData, addLog, removeLog, updateLog, checkEntryToday, getLowestWeight, getHighestWeight };
}
