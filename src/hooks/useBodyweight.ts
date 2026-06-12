import { BodyweightRepository } from '@/database/bodyweightRepository';
import { useEffect, useState } from 'react';

export function useBodyweight() {
    const [logs, setLogs] = useState<any[]>([]);

    const fetchLogs = async () => {
        try {
            const data = await BodyweightRepository.findAll();
            const dd = calcWeeklyAvg();
            setLogs(data);
        } catch (error) {
            console.error("Erro ao carregar logs:", error);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const calcWeeklyAvg = () => {
        if (logs.length === 0) return 0;
        const now = new Date();
        const currentDay = now.getDay() === 0 ? 7 : now.getDay();

        // Encontra o início do dia da Segunda-feira atual
        const monday = new Date(now);
        monday.setDate(now.getDate() - currentDay + 1);
        monday.setHours(0, 0, 0, 0);

        const currentWeekLogs = logs.filter(log => {
            // Converte a string "DD/MM/YY" de volta para Date
            const [day, month, year] = log.date.split('/');
            const logDate = new Date(2000 + Number(year), Number(month) - 1, Number(day));

            return logDate >= monday;
        });

        if (currentWeekLogs.length === 0) return 0;

        const total = currentWeekLogs.reduce((sum, log) => sum + log.weight, 0);
        return total / currentWeekLogs.length;
    };

    const addLog = async (date: string, weightStr: string) => {
        if (!weightStr) return false;

        try {
            await BodyweightRepository.create(date, parseFloat(weightStr));
            await fetchLogs();
            return true;
        } catch (error) {
            console.error("Erro ao salvar peso:", error);
            return false;
        }
    };

    return { logs, addLog };
}