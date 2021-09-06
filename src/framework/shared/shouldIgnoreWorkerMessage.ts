export function shouldIgnoreWorkerMessage(message: any) {
    if (message === null || typeof message !== 'object') {
        return false;
    }

    const command = message.command;

    if (typeof command !== 'string') {
        return false;
    }

    return (
        command === 'CONSTRUCT' ||
        command === 'CALL' ||
        command === 'SET' ||
        command === 'RPC_CALLBACK'
    );
}
