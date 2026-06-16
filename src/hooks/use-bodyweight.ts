import { BodyweightRepository } from '@/database/bodyweightRepository';
import { useEffect, useMemo, useState } from 'react';

export function useBodyweight() {
    const [logs, setLogs] = useState<any[]>([]);

    const fetchLogs = async () => {
        try {
            const data = await BodyweightRepository.findAll();
            setLogs(data);
        } catch (error) {
            console.error("Error loading logs:", error);
        }
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
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        return await BodyweightRepository.existsByDate(today);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const calcWeeklyAvg = () => {
        if (logs.length === 0) return 0;
        const now = new Date();
        const currentDay = now.getDay() === 0 ? 7 : now.getDay();

        const monday = new Date(now);
        monday.setDate(now.getDate() - currentDay + 1);
        monday.setHours(0, 0, 0, 0);

        const currentWeekLogs = logs.filter(log => {
            const [day, month, year] = log.date.split('/');
            const logDate = new Date(2000 + Number(year), Number(month) - 1, Number(day));
            return logDate >= monday;
        });

        if (currentWeekLogs.length === 0) return 0;
        const total = currentWeekLogs.reduce((sum, log) => sum + log.weight, 0);
        return total / currentWeekLogs.length;
    };

    const weeklyData = useMemo(() => {
        const groups: Record<string, any[]> = {};

        logs.forEach(log => {
            const [day, month, year] = log.date.split('/');
            const date = new Date(2000 + Number(year), Number(month) - 1, Number(day));
            const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

            const monday = new Date(date);
            monday.setDate(date.getDate() - dayOfWeek + 1);
            const weekKey = monday.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

            if (!groups[weekKey]) groups[weekKey] = [];
            groups[weekKey].push(log);
        });

        return Object.entries(groups).map(([weekStart, entries]) => {
            const count = entries.length;
            const avg = entries.reduce((sum, e) => sum + e.weight, 0) / count;

            return {
                id: weekStart,
                count,
                weekStart, // Data da segunda-feira da semana
                avg: avg.toFixed(1),
                entries
            };
        });
    }, [logs]);

    return { weeklyData, addLog, removeLog, updateLog, checkEntryToday };
}