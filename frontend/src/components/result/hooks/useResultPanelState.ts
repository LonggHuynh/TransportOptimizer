type ResultTone = 'idle' | 'working' | 'success' | 'error';

export const useResultPanelState = ({
    status,
    error,
    estimatedTime,
    routeLegCount,
}: {
    status?: string;
    error?: string;
    estimatedTime: number | null;
    routeLegCount: number;
}) => {
    const shouldShowResultPanel = Boolean(status || error);
    const hasResult = status === 'completed' && estimatedTime !== null;
    const hasNoRoute = status === 'completed' && estimatedTime === null;
    const isComputing = status === 'queued' || status === 'processing';

    const statusMeta: { label: string; tone: ResultTone } = (() => {
        if (error || status === 'failed') {
            return { label: 'Failed', tone: 'error' };
        }

        if (hasNoRoute) {
            return { label: 'No Route', tone: 'error' };
        }

        if (isComputing) {
            return { label: 'Optimizing', tone: 'working' };
        }

        if (hasResult) {
            return { label: 'Ready', tone: 'success' };
        }

        return { label: 'Waiting', tone: 'idle' };
    })();

    const duration = (() => {
        if (estimatedTime === null || estimatedTime <= 0) {
            return '—';
        }

        const minutes = Math.round(estimatedTime / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (!hours) {
            return `${minutes} min`;
        }

        return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
    })();

    return {
        shouldShowResultPanel,
        hasResult,
        isComputing,
        statusMeta,
        duration,
        routeLegCount,
    };
};
